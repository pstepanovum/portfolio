import "server-only";

/** Shared error for every Google API client; carries the HTTP status. */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

/**
 * Minimal authenticated fetch for Google REST APIs. Handles empty bodies
 * (DELETE, 204) and surfaces Google's error message with the status, which
 * the MCP layer turns into a reconnect hint when scopes are missing.
 */
export async function googleFetch<T>(
  accessToken: string,
  url: string,
  init: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const { raw, ...rest } = init;
  const response = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(rest.body && !(rest.headers as Record<string, string> | undefined)?.["Content-Type"]
        ? { "Content-Type": "application/json" }
        : {}),
      ...(rest.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } | string };
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Google API returned HTTP ${response.status}.`;

    throw new GoogleApiError(message, response.status);
  }

  if (raw) {
    return (await response.arrayBuffer()) as unknown as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}
