"use client";

import { useCallback, useState } from "react";

const LINK_SCRIPT = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

/**
 * Link tokens have to survive the trip to the bank and back.
 *
 * An OAuth institution navigates the whole tab away to its own sign-in page,
 * so the token that started the flow cannot live in React state. sessionStorage
 * is per tab and per origin, which is exactly the lifetime of one Link attempt,
 * and it is cleared as soon as the flow resolves.
 */
const TOKEN_KEY = "plaid.linkToken";

type PlaidHandler = { open: () => void; exit: () => void; destroy: () => void };

type PlaidConfig = {
  token: string;
  receivedRedirectUri?: string;
  onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
  onExit: (error: { display_message?: string; error_message?: string } | null) => void;
};

export type PlaidSuccessMetadata = {
  institution?: { institution_id?: string; name?: string } | null;
};

declare global {
  interface Window {
    Plaid?: { create: (config: PlaidConfig) => PlaidHandler };
  }
}

let scriptPromise: Promise<void> | undefined;

function loadLinkScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Plaid Link only runs in the browser."));
  }

  if (window.Plaid) {
    return Promise.resolve();
  }

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LINK_SCRIPT}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Plaid Link failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.src = LINK_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Plaid Link failed to load."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeToken(token: string) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // A blocked storage API only costs us the OAuth resume path.
  }
}

function clearStoredToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do; the token expires on its own within hours.
  }
}

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

async function exchange(publicToken: string, metadata: PlaidSuccessMetadata) {
  const response = await fetch("/api/admin/plaid/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicToken,
      institutionId: metadata.institution?.institution_id,
      institutionName: metadata.institution?.name,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to link that bank."));
  }
}

type FlowState = { busy: boolean; error: string | null };

/**
 * Opens Link for a new bank, or for re-authenticating one the bank has asked
 * the user to confirm again. `onLinked` runs only after the public token has
 * been exchanged and stored.
 */
export function usePlaidLink(onLinked: () => void) {
  const [state, setState] = useState<FlowState>({ busy: false, error: null });

  const open = useCallback(
    async (itemId?: string) => {
      setState({ busy: true, error: null });

      try {
        const [response] = await Promise.all([
          fetch("/api/admin/plaid/link-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemId ? { itemId } : {}),
          }),
          loadLinkScript(),
        ]);

        if (!response.ok) {
          throw new Error(await readError(response, "Unable to start Plaid Link."));
        }

        const { linkToken } = (await response.json()) as { linkToken: string };
        storeToken(linkToken);

        if (!window.Plaid) {
          throw new Error("Plaid Link failed to load.");
        }

        window.Plaid.create({
          token: linkToken,
          onSuccess: async (publicToken, metadata) => {
            try {
              await exchange(publicToken, metadata);
              clearStoredToken();
              setState({ busy: false, error: null });
              onLinked();
            } catch (error) {
              clearStoredToken();
              setState({
                busy: false,
                error: error instanceof Error ? error.message : "Unable to link that bank.",
              });
            }
          },
          onExit: (error) => {
            clearStoredToken();
            setState({
              busy: false,
              error: error ? error.display_message || error.error_message || "Link was cancelled." : null,
            });
          },
        }).open();
      } catch (error) {
        clearStoredToken();
        setState({
          busy: false,
          error: error instanceof Error ? error.message : "Unable to start Plaid Link.",
        });
      }
    },
    [onLinked],
  );

  return { ...state, open };
}

/**
 * Resumes a Link session that went out to a bank's OAuth page.
 *
 * Plaid appends an oauth_state_id to the redirect and expects Link to be
 * re-created with the original token plus the full URL it landed on, with no
 * extra query parameters added.
 */
export function resumePlaidOAuth(callbacks: {
  onLinked: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}) {
  const token = readStoredToken();

  if (!token) {
    callbacks.onError(
      "This sign-in could not be matched to a Link session. Start again from the Plaid page.",
    );
    return;
  }

  loadLinkScript()
    .then(() => {
      if (!window.Plaid) {
        throw new Error("Plaid Link failed to load.");
      }

      window.Plaid.create({
        token,
        receivedRedirectUri: window.location.href,
        onSuccess: async (publicToken, metadata) => {
          try {
            await exchange(publicToken, metadata);
            clearStoredToken();
            callbacks.onLinked();
          } catch (error) {
            clearStoredToken();
            callbacks.onError(error instanceof Error ? error.message : "Unable to link that bank.");
          }
        },
        onExit: (error) => {
          clearStoredToken();

          if (error) {
            callbacks.onError(error.display_message || error.error_message || "Link was cancelled.");
          } else {
            callbacks.onCancel();
          }
        },
      }).open();
    })
    .catch((error: unknown) => {
      callbacks.onError(error instanceof Error ? error.message : "Plaid Link failed to load.");
    });
}
