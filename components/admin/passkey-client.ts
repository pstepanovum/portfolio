"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn };

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as (T & { error?: string }) | null;

  if (!response.ok || !result) {
    throw new Error(result?.error || fallback);
  }

  return result;
}

function describeCeremonyError(error: unknown, fallback: string) {
  if (error instanceof Error && (error.name === "NotAllowedError" || error.name === "AbortError")) {
    return new Error("The passkey prompt was closed or timed out.");
  }

  return error instanceof Error ? error : new Error(fallback);
}

/** Asks the server for a challenge and has the browser sign it with an enrolled passkey. */
export async function getPasskeyAssertion(
  request: { purpose: "sign-in"; idToken: string } | { purpose: "step-up" },
): Promise<AuthenticationResponseJSON> {
  const { options } = await postJson<{ options: PublicKeyCredentialRequestOptionsJSON }>(
    "/api/auth/passkeys/options",
    request,
    "Unable to start the passkey prompt.",
  );

  try {
    return await startAuthentication({ optionsJSON: options });
  } catch (error) {
    throw describeCeremonyError(error, "The passkey could not be used.");
  }
}

/**
 * Proof of a second factor for a sensitive change: the typed code when there
 * is one, otherwise a passkey prompt. Every call is checked again server-side.
 */
export async function getSecondFactorProof(code: string, hasPasskeys: boolean) {
  const trimmed = code.trim();

  if (trimmed) return { code: trimmed };
  if (hasPasskeys) return { passkey: await getPasskeyAssertion({ purpose: "step-up" }) };

  throw new Error("Enter a current authenticator or recovery code first.");
}

/** Registers a new passkey after a fresh second factor. */
export async function registerPasskey(proof: { code?: string; passkey?: AuthenticationResponseJSON }, name: string) {
  const { options } = await postJson<{ options: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/auth/passkeys/register/options",
    proof,
    "Unable to start passkey registration.",
  );

  let response;

  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidStateError") {
      throw new Error("This device already has a passkey registered here.");
    }

    throw describeCeremonyError(error, "The passkey could not be created.");
  }

  return postJson<{ passkey: { id: string; name: string } }>(
    "/api/auth/passkeys/register",
    { response, name },
    "Unable to register the passkey.",
  );
}
