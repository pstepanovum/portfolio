import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";
import { adminDb } from "@/lib/firebase/admin-core";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/auth/totp";

const COLLECTION = "adminSecurity";
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const RECOVERY_CODE_COUNT = 10;
const ISSUER = "pstepanov.dev";

export type MfaState = {
  enrolled: boolean;
  enrolledAt?: string;
  recoveryCodesRemaining: number;
  lockedUntil?: string;
};

type SecurityDoc = {
  totpSecret?: string;
  pendingSecret?: string;
  pendingCreatedAt?: Timestamp;
  enrolledAt?: Timestamp;
  recoveryCodes?: string[];
  lastUsedStep?: number;
  failedAttempts?: number;
  lockedUntil?: Timestamp;
};

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
    enrolled: Boolean(doc.totpSecret),
    enrolledAt: doc.enrolledAt?.toDate().toISOString(),
    recoveryCodesRemaining: doc.recoveryCodes?.length ?? 0,
    lockedUntil: lockedUntil > Date.now() ? new Date(lockedUntil).toISOString() : undefined,
  };
}

export async function isMfaEnrolled(uid: string) {
  return Boolean((await readDoc(uid)).totpSecret);
}

export class MfaAlreadyEnrolledError extends Error {
  constructor() {
    super("Two-factor authentication is already set up. Turn it off with a current code before enrolling a new authenticator.");
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
 * through turning it off first, which does demand a current code.
 */
export async function startEnrollment(uid: string, accountLabel: string) {
  if (await isMfaEnrolled(uid)) {
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
    public readonly code: "invalid" | "locked" | "not_enrolled",
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

    if (!doc.totpSecret) {
      return { kind: "not_enrolled" as const };
    }

    const lockedUntil = doc.lockedUntil?.toMillis() ?? 0;

    if (lockedUntil > Date.now()) {
      return { kind: "locked" as const, lockedUntil };
    }

    const step = verifyTotp(decryptSecret(doc.totpSecret), code);

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

    const failures = (doc.failedAttempts ?? 0) + 1;

    if (failures >= MAX_FAILURES) {
      tx.update(ref, { failedAttempts: 0, lockedUntil: Timestamp.fromMillis(Date.now() + LOCKOUT_MS) });
    } else {
      tx.update(ref, { failedAttempts: failures });
    }

    return { kind: "invalid" as const, failures };
  });

  if (outcome.kind === "not_enrolled") {
    throw new MfaError("Two-factor authentication is not set up for this account.", "not_enrolled");
  }

  if (outcome.kind === "locked") {
    throw new MfaError(
      `Too many failed codes. Try again after ${new Date(outcome.lockedUntil).toLocaleTimeString("en-US")}.`,
      "locked",
    );
  }

  if (outcome.kind === "invalid") {
    throw new MfaError(
      outcome.failures >= MAX_FAILURES
        ? "Too many failed codes; sign-in is locked for 15 minutes."
        : `That code did not match (${MAX_FAILURES - outcome.failures} attempts left).`,
      "invalid",
    );
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

export async function disableMfa(uid: string) {
  await adminDb.collection(COLLECTION).doc(uid).delete();
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
