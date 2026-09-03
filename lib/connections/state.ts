import "server-only";

import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";

export const CONNECT_STATE_COOKIE = "portfolio_google_connect";
const STATE_TTL_MS = 10 * 60 * 1000;

export type ConnectStatePayload = {
  nonce: string;
  alias?: string;
  loginHint?: string;
  reconnectId?: string;
  adminUid: string;
  expiresAt: number;
};

/**
 * The OAuth `state` carries the connect intent (alias, which account to
 * reconnect) encrypted, and is bound to the browser by a cookie holding the
 * same nonce. Google echoes the state back; only a callback that presents both
 * halves is accepted, which is what defeats login CSRF on the callback.
 */
export function createConnectState(
  input: Omit<ConnectStatePayload, "nonce" | "expiresAt">,
) {
  const nonce = randomBytes(16).toString("base64url");
  const payload: ConnectStatePayload = {
    ...input,
    nonce,
    expiresAt: Date.now() + STATE_TTL_MS,
  };

  return { nonce, state: encryptSecret(JSON.stringify(payload)) };
}

export function readConnectState(
  state: string | null | undefined,
  cookieNonce: string | null | undefined,
): ConnectStatePayload | null {
  if (!state || !cookieNonce) {
    return null;
  }

  let payload: ConnectStatePayload;

  try {
    payload = JSON.parse(decryptSecret(state)) as ConnectStatePayload;
  } catch {
    return null;
  }

  if (payload.nonce !== cookieNonce || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
}
