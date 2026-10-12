import { createHash } from "node:crypto";

/**
 * Pure rules behind passkeys and the shared second-factor lockout. Nothing
 * here touches Firestore or the request, so `tests/passkey-policy.test.ts`
 * covers it directly; `lib/auth/passkeys.ts` applies it inside transactions.
 */

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const MAX_PENDING_CHALLENGES = 5;
export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const MAX_PASSKEYS = 10;
export const PASSKEY_NAME_MAX = 60;

// ---------------------------------------------------------------------------
// Relying party
// ---------------------------------------------------------------------------

export type RelyingParty = { rpID: string; origin: string };

/**
 * The RP ID and the one origin an assertion may come from.
 *
 * In production the Host header is never consulted: the origin is
 * OAUTH_ISSUER when set, otherwise the site's canonical URL, so a spoofed
 * Host cannot make the server accept a ceremony run for another domain.
 * Outside production a request to `localhost` (any port) is trusted as
 * http://localhost:<port>, the only non-https origin browsers allow WebAuthn
 * on; IP literals are not valid RP IDs, so they fall back to the canonical
 * URL like any other host.
 */
export function resolveRelyingParty(input: {
  nodeEnv: string | undefined;
  configuredIssuer: string | undefined;
  siteUrl: string;
  host: string | null | undefined;
}): RelyingParty {
  const configured = input.configuredIssuer?.trim();
  let base = configured || input.siteUrl;

  if (!configured && input.nodeEnv !== "production") {
    const host = (input.host ?? "").trim().toLowerCase();

    if (/^localhost(:\d{1,5})?$/.test(host)) {
      base = `http://${host}`;
    }
  }

  const url = new URL(base);

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error(`Passkeys need an https origin; ${url.origin} is not one.`);
  }

  return { rpID: url.hostname, origin: url.origin };
}

// ---------------------------------------------------------------------------
// Challenges: server-issued, single use, short-lived, bound to one browser
// ---------------------------------------------------------------------------

export type ChallengePurpose = "sign-in" | "step-up" | "register";

export type StoredChallenge = {
  challenge: string;
  purpose: ChallengePurpose;
  binding: string;
  expiresAt: number;
};

export type ChallengeMap = Record<string, StoredChallenge>;

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Map key for a challenge; the challenge itself is only matched by digest. */
export function challengeKey(challenge: string) {
  return sha256Hex(`challenge:${challenge}`);
}

/**
 * Ties a challenge to the browser that asked for it (a random nonce in an
 * httpOnly cookie) and, once signed in, to that exact session cookie, so a
 * challenge fetched in one session cannot be answered from another.
 */
export function challengeBinding(nonce: string, sessionCookie?: string | null) {
  return sha256Hex(`binding:${nonce}\n${sessionCookie ?? ""}`);
}

/** Drops expired entries and keeps only the newest few. */
export function pruneChallenges(map: ChallengeMap | undefined, now: number): ChallengeMap {
  const live = Object.entries(map ?? {})
    .filter(([, entry]) => entry && entry.expiresAt > now)
    .sort(([, a], [, b]) => b.expiresAt - a.expiresAt)
    .slice(0, MAX_PENDING_CHALLENGES - 1);

  return Object.fromEntries(live);
}

export function addChallenge(
  map: ChallengeMap | undefined,
  entry: Omit<StoredChallenge, "expiresAt">,
  now: number,
): ChallengeMap {
  return {
    ...pruneChallenges(map, now),
    [challengeKey(entry.challenge)]: { ...entry, expiresAt: now + CHALLENGE_TTL_MS },
  };
}

export type ChallengeDecision =
  | { ok: true; key: string; challenge: string }
  | { ok: false; key: string | null; reason: "unknown" | "expired" | "wrong_purpose" | "wrong_binding" };

/**
 * Looks up the challenge the browser signed. The caller deletes `key`
 * whenever it is not null, success or not, in the same transaction that
 * records the outcome: a challenge is spent the first time anyone presents it.
 */
export function evaluateChallenge(
  map: ChallengeMap | undefined,
  presented: { challenge: string | null; purpose: ChallengePurpose; binding: string; now: number },
): ChallengeDecision {
  if (!presented.challenge) return { ok: false, key: null, reason: "unknown" };

  const key = challengeKey(presented.challenge);
  const entry = map?.[key];

  if (!entry || entry.challenge !== presented.challenge) return { ok: false, key: null, reason: "unknown" };
  if (entry.expiresAt <= presented.now) return { ok: false, key, reason: "expired" };
  if (entry.purpose !== presented.purpose) return { ok: false, key, reason: "wrong_purpose" };
  if (entry.binding !== presented.binding) return { ok: false, key, reason: "wrong_binding" };

  return { ok: true, key, challenge: entry.challenge };
}

/** The challenge a browser response claims to answer, read from clientDataJSON. */
export function challengeFromClientData(clientDataJSON: unknown): string | null {
  if (typeof clientDataJSON !== "string" || clientDataJSON.length > 4096) return null;

  try {
    const parsed = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8")) as { challenge?: unknown };
    return typeof parsed.challenge === "string" && parsed.challenge.length > 0 ? parsed.challenge : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export type PasskeyRecord = {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  name: string;
};

export function findCredential<T extends { id: string }>(credentials: T[] | undefined, id: unknown): T | null {
  if (typeof id !== "string" || !id) return null;
  return (credentials ?? []).find((credential) => credential.id === id) ?? null;
}

/**
 * Clone detection. Authenticators that count report a strictly increasing
 * number; one that does not is a copied key or a replay. Synced passkeys
 * report 0 every time, which is allowed only while the stored value is 0 too.
 */
export function counterDecision(stored: number, received: number): "ok" | "clone_suspected" {
  if ((received > 0 || stored > 0) && received <= stored) return "clone_suspected";
  return "ok";
}

export function sanitizePasskeyName(name: unknown, fallback = "Passkey") {
  const clean = typeof name === "string"
    ? name.normalize("NFKC").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim().slice(0, PASSKEY_NAME_MAX)
    : "";
  return clean || fallback;
}

// ---------------------------------------------------------------------------
// Factors
// ---------------------------------------------------------------------------

export type FactorSet = { totp: boolean; passkeyIds: string[] };

export function hasAnyFactor(factors: FactorSet) {
  return factors.totp || factors.passkeyIds.length > 0;
}

export type FactorRemoval = { kind: "totp" } | { kind: "passkey"; id: string };

/**
 * At least one second factor must always remain. Removing the last one would
 * drop the account back to "not enrolled", where the dashboard asks for a new
 * authenticator without any current code: exactly what a hijacked session
 * would want. Starting over without a factor goes through the Admin SDK.
 */
export function canRemoveFactor(factors: FactorSet, removal: FactorRemoval) {
  const remainingPasskeys = removal.kind === "passkey"
    ? factors.passkeyIds.filter((id) => id !== removal.id)
    : factors.passkeyIds;
  const remainingTotp = removal.kind === "totp" ? false : factors.totp;

  return hasAnyFactor({ totp: remainingTotp, passkeyIds: remainingPasskeys });
}

// ---------------------------------------------------------------------------
// Shared lockout (TOTP, recovery codes, and passkeys count against one budget)
// ---------------------------------------------------------------------------

export function isLockedOut(lockedUntilMs: number | undefined, now: number) {
  return (lockedUntilMs ?? 0) > now;
}

export function nextFailureState(failedAttempts: number | undefined, now: number) {
  const failures = (failedAttempts ?? 0) + 1;

  return failures >= MAX_FAILURES
    ? { failures, failedAttempts: 0, lockedUntil: now + LOCKOUT_MS }
    : { failures, failedAttempts: failures, lockedUntil: null };
}
