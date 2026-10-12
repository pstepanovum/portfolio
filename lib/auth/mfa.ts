import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";
import { adminDb } from "@/lib/firebase/admin-core";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/auth/totp";
import {
  MAX_FAILURES,
  canRemoveFactor,
  hasAnyFactor,
  isLockedOut,
  nextFailureState,
  type ChallengeMap,
  type PasskeyRecord,
} from "@/lib/auth/passkey-policy";

export const SECURITY_COLLECTION = "adminSecurity";
const COLLECTION = SECURITY_COLLECTION;
const RECOVERY_CODE_COUNT = 10;
const PENDING_SECRET_TTL_MS = 10 * 60 * 1000;
const ISSUER = "pstepanov.dev";

export type PasskeySummary = {
  id: string;
  name: string;
  createdAt?: string;
  lastUsedAt?: string;
  backedUp: boolean;
};

export type MfaState = {
  /** Any second factor is enrolled: an authenticator app, a passkey, or both. */
  enrolled: boolean;
  totpEnrolled: boolean;
  enrolledAt?: string;
  passkeys: PasskeySummary[];
  recoveryCodesRemaining: number;
  lockedUntil?: string;
};

export type StoredPasskey = PasskeyRecord & {
  createdAt?: Timestamp;
  lastUsedAt?: Timestamp;
  deviceType?: string;
  backedUp?: boolean;
  aaguid?: string;
};

export type SecurityDoc = {
  totpSecret?: string;
  pendingSecret?: string;
  pendingCreatedAt?: Timestamp;
  enrolledAt?: Timestamp;
  recoveryCodes?: string[];
  lastUsedStep?: number;
  failedAttempts?: number;
  lockedUntil?: Timestamp;
  passkeys?: StoredPasskey[];
  passkeyChallenges?: ChallengeMap;
};

export function factorsOf(doc: SecurityDoc) {
  return { totp: Boolean(doc.totpSecret), passkeyIds: (doc.passkeys ?? []).map((passkey) => passkey.id) };
}

/** Firestore update fields for one failed attempt against the shared budget. */
export function failureUpdate(doc: SecurityDoc, now = Date.now()) {
  const next = nextFailureState(doc.failedAttempts, now);

  return {
    failures: next.failures,
    fields: next.lockedUntil
      ? { failedAttempts: 0, lockedUntil: Timestamp.fromMillis(next.lockedUntil) }
      : { failedAttempts: next.failedAttempts },
  };
}

export function lockedMessage(lockedUntil: number) {
  return `Too many failed attempts. Try again after ${new Date(lockedUntil).toLocaleTimeString("en-US")}.`;
}

export function failureMessage(failures: number, what = "That code did not match") {
  return failures >= MAX_FAILURES
    ? "Too many failed attempts; sign-in is locked for 15 minutes."
    : `${what} (${MAX_FAILURES - failures} attempts left).`;
}

function hashCode(code: string) {
  return createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
}

function generateRecoveryCode() {
  // 10 chars from an unambiguous alphabet, shown as XXXXX-XXXXX.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = Array.from(randomBytes(10), (byte) => alphabet[byte % alphabet.length]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

async function readDoc(uid: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(uid).get();
  return (snapshot.data() as SecurityDoc | undefined) ?? {};
}

export async function getMfaState(uid: string): Promise<MfaState> {
  const doc = await readDoc(uid);
  const lockedUntil = doc.lockedUntil?.toMillis() ?? 0;

  return {
    enrolled: hasAnyFactor(factorsOf(doc)),
    totpEnrolled: Boolean(doc.totpSecret),
    enrolledAt: doc.totpSecret ? doc.enrolledAt?.toDate().toISOString() : undefined,
    passkeys: (doc.passkeys ?? []).map((passkey) => ({
      id: passkey.id,
      name: passkey.name,
      createdAt: passkey.createdAt?.toDate().toISOString(),
      lastUsedAt: passkey.lastUsedAt?.toDate().toISOString(),
      backedUp: Boolean(passkey.backedUp),
    })),
    recoveryCodesRemaining: doc.recoveryCodes?.length ?? 0,
    lockedUntil: lockedUntil > Date.now() ? new Date(lockedUntil).toISOString() : undefined,
  };
}

/** True once any second factor (authenticator app or passkey) is enrolled. */
export async function isMfaEnrolled(uid: string) {
  return hasAnyFactor(factorsOf(await readDoc(uid)));
}

export async function hasPasskeys(uid: string) {
  return ((await readDoc(uid)).passkeys ?? []).length > 0;
}

export class MfaAlreadyEnrolledError extends Error {
  constructor() {
    super("An authenticator app is already set up. Turn it off with a current code or passkey before enrolling a new one.");
    this.name = "MfaAlreadyEnrolledError";
  }
}

/**
 * Creates a pending secret; nothing is enforced until confirmEnrollment.
 *
 * Refused outright once an authenticator is enrolled. Enrollment needs no
 * current code, so allowing it here would let anyone holding a live session,
 * for instance stolen cookies, swap in their own authenticator and new
 * recovery codes and lock the owner out. Replacing an authenticator goes
 * through turning it off first, which does demand a current code. When a
 * passkey is already enrolled, the route also demands a fresh passkey or
 * recovery code before calling this, for the same reason.
 */
export async function startEnrollment(uid: string, accountLabel: string) {
  if ((await readDoc(uid)).totpSecret) {
    throw new MfaAlreadyEnrolledError();
  }

  const secret = generateTotpSecret();

  await adminDb.collection(COLLECTION).doc(uid).set(
    { pendingSecret: encryptSecret(secret), pendingCreatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return { secret, uri: otpauthUri(secret, accountLabel, ISSUER) };
}

/** Proves the authenticator works before switching enforcement on. */
export async function confirmEnrollment(uid: string, code: string) {
  const doc = await readDoc(uid);

  // Checked again here, not only at the start: a pending secret created before
  // enrollment completed elsewhere must not be able to overwrite it.
  if (doc.totpSecret) {
    throw new MfaAlreadyEnrolledError();
  }

  if (!doc.pendingSecret) {
    throw new Error("Start enrollment first.");
  }

  if ((doc.pendingCreatedAt?.toMillis() ?? 0) + PENDING_SECRET_TTL_MS < Date.now()) {
    throw new Error("This setup expired. Start again.");
  }

  const secret = decryptSecret(doc.pendingSecret);
  const step = verifyTotp(secret, code);

  if (step === null) {
    throw new Error("That code did not match. Check the authenticator app's time and try again.");
  }

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);

  await adminDb.collection(COLLECTION).doc(uid).set({
    totpSecret: doc.pendingSecret,
    pendingSecret: FieldValue.delete(),
    pendingCreatedAt: FieldValue.delete(),
    enrolledAt: FieldValue.serverTimestamp(),
    recoveryCodes: recoveryCodes.map(hashCode),
    lastUsedStep: step,
    failedAttempts: 0,
    lockedUntil: FieldValue.delete(),
  }, { merge: true });

  return recoveryCodes;
}

export class MfaError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid" | "locked" | "not_enrolled" | "required",
  ) {
    super(message);
    this.name = "MfaError";
  }
}

/**
 * Verifies a TOTP or a recovery code.
 *
 * Runs as a single Firestore transaction. Reading the counters and writing
 * them back separately let concurrent requests all read the same failure
 * count, so the five-attempt lockout allowed far more guesses than five, and
 * two simultaneous requests could both spend one TOTP step or one recovery
 * code. The Admin SDK locks the document for the transaction, so concurrent
 * attempts now serialize and each one sees the last one's result.
 *
 * A TOTP step is accepted only when it is strictly newer than the last one
 * used. Checking "not equal" instead would still accept a code for an earlier
 * step that remains inside the clock-skew window after a later one was used.
 */
export async function verifySecondFactor(uid: string, code: string) {
  const ref = adminDb.collection(COLLECTION).doc(uid);

  const outcome = await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const doc = (snapshot.data() as SecurityDoc | undefined) ?? {};

    if (!hasAnyFactor(factorsOf(doc))) {
      return { kind: "not_enrolled" as const };
    }

    const lockedUntil = doc.lockedUntil?.toMillis() ?? 0;

    if (isLockedOut(lockedUntil, Date.now())) {
      return { kind: "locked" as const, lockedUntil };
    }

    // A passkey-only account has no TOTP secret; its recovery codes still work.
    const step = doc.totpSecret ? verifyTotp(decryptSecret(doc.totpSecret), code) : null;

    if (step !== null && step > (doc.lastUsedStep ?? -1)) {
      tx.update(ref, { lastUsedStep: step, failedAttempts: 0, lockedUntil: FieldValue.delete() });
      return { kind: "ok" as const, usedRecoveryCode: false };
    }

    const hashed = hashCode(code);
    const index = (doc.recoveryCodes ?? []).findIndex((stored) =>
      timingSafeEqual(Buffer.from(stored), Buffer.from(hashed)),
    );

    if (index >= 0) {
      const remaining = [...(doc.recoveryCodes ?? [])];
      remaining.splice(index, 1);
      tx.update(ref, { recoveryCodes: remaining, failedAttempts: 0, lockedUntil: FieldValue.delete() });
      return { kind: "ok" as const, usedRecoveryCode: true, recoveryCodesRemaining: remaining.length };
    }

    const failure = failureUpdate(doc);
    tx.update(ref, failure.fields);

    return { kind: "invalid" as const, failures: failure.failures };
  });

  if (outcome.kind === "not_enrolled") {
    throw new MfaError("Two-factor authentication is not set up for this account.", "not_enrolled");
  }

  if (outcome.kind === "locked") {
    throw new MfaError(lockedMessage(outcome.lockedUntil), "locked");
  }

  if (outcome.kind === "invalid") {
    throw new MfaError(failureMessage(outcome.failures), "invalid");
  }

  return outcome.usedRecoveryCode
    ? { ok: true, usedRecoveryCode: true, recoveryCodesRemaining: outcome.recoveryCodesRemaining }
    : { ok: true, usedRecoveryCode: false };
}

export async function regenerateRecoveryCodes(uid: string) {
  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  await adminDb.collection(COLLECTION).doc(uid).update({ recoveryCodes: recoveryCodes.map(hashCode) });
  return recoveryCodes;
}

export class LastFactorError extends Error {
  constructor() {
    super("At least one second factor must stay enrolled. Add a passkey or an authenticator app before removing this one.");
    this.name = "LastFactorError";
  }
}

/**
 * Turns off the authenticator app. Refused while it is the only factor: the
 * account would fall back to "not enrolled", where a new authenticator can be
 * set up without any current code. Recovery codes stay, since they also
 * stand in for a lost passkey.
 */
export async function disableTotp(uid: string) {
  const ref = adminDb.collection(COLLECTION).doc(uid);

  await adminDb.runTransaction(async (tx) => {
    const doc = ((await tx.get(ref)).data() as SecurityDoc | undefined) ?? {};

    if (!doc.totpSecret) {
      throw new Error("No authenticator app is set up.");
    }

    if (!canRemoveFactor(factorsOf(doc), { kind: "totp" })) {
      throw new LastFactorError();
    }

    tx.update(ref, {
      totpSecret: FieldValue.delete(),
      lastUsedStep: FieldValue.delete(),
      enrolledAt: FieldValue.delete(),
      pendingSecret: FieldValue.delete(),
      pendingCreatedAt: FieldValue.delete(),
    });
  });
}

// ---------------------------------------------------------------------------
// Second-factor cookie: proves this browser passed MFA for this uid.
// ---------------------------------------------------------------------------

export function issueMfaCookieValue(uid: string, ttlSeconds: number) {
  return encryptSecret(JSON.stringify({ uid, exp: Date.now() + ttlSeconds * 1000, nonce: randomBytes(8).toString("hex") }));
}

export function readMfaCookieValue(value: string | undefined, uid: string) {
  if (!value) return false;

  try {
    const payload = JSON.parse(decryptSecret(value)) as { uid?: string; exp?: number };
    return payload.uid === uid && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
