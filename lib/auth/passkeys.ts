import "server-only";

import { createHash } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import {
  MfaError,
  SECURITY_COLLECTION,
  LastFactorError,
  failureMessage,
  failureUpdate,
  factorsOf,
  lockedMessage,
  type SecurityDoc,
  type StoredPasskey,
} from "@/lib/auth/mfa";
import {
  MAX_PASSKEYS,
  addChallenge,
  canRemoveFactor,
  challengeFromClientData,
  counterDecision,
  evaluateChallenge,
  findCredential,
  isLockedOut,
  pruneChallenges,
  sanitizePasskeyName,
  type ChallengePurpose,
  type RelyingParty,
} from "@/lib/auth/passkey-policy";

const RP_NAME = "pstepanov.dev";
const CEREMONY_TIMEOUT_MS = 60_000;

function securityRef(uid: string) {
  return adminDb.collection(SECURITY_COLLECTION).doc(uid);
}

async function readDocIn(tx: Transaction, uid: string) {
  return ((await tx.get(securityRef(uid))).data() as SecurityDoc | undefined) ?? {};
}

/** A stable, opaque WebAuthn user handle; the Firebase uid itself never leaves the server. */
function userHandle(uid: string) {
  return new Uint8Array(createHash("sha256").update(`passkey-user:${uid}`).digest());
}

function logSecurityEvent(event: string, uid: string, detail: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ severity: "NOTICE", component: "admin-security", event, uid, ...detail }));
}

/** Stores a fresh challenge for this uid, purpose, and browser binding. */
async function storeChallenge(uid: string, challenge: string, purpose: ChallengePurpose, binding: string) {
  const ref = securityRef(uid);

  await adminDb.runTransaction(async (tx) => {
    const doc = await readDocIn(tx, uid);
    // update(), not set(merge): a merge deep-merges maps, so pruned and spent
    // challenges would survive. The document always exists here, since both
    // callers require an enrolled factor.
    tx.update(ref, { passkeyChallenges: addChallenge(doc.passkeyChallenges, { challenge, purpose, binding }, Date.now()) });
  });
}

/** Options for navigator.credentials.get(): a sign-in or a step-up with an enrolled passkey. */
export async function createAuthenticationOptions(
  uid: string,
  rp: RelyingParty,
  purpose: Exclude<ChallengePurpose, "register">,
  binding: string,
) {
  const doc = ((await securityRef(uid).get()).data() as SecurityDoc | undefined) ?? {};
  const passkeys = doc.passkeys ?? [];

  if (passkeys.length === 0) {
    throw new MfaError("No passkey is registered for this account.", "not_enrolled");
  }

  if (isLockedOut(doc.lockedUntil?.toMillis(), Date.now())) {
    throw new MfaError(lockedMessage(doc.lockedUntil!.toMillis()), "locked");
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: passkeys.map((passkey) => ({ id: passkey.id, transports: passkey.transports })),
    userVerification: "required",
    timeout: CEREMONY_TIMEOUT_MS,
  });

  await storeChallenge(uid, options.challenge, purpose, binding);
  return options;
}

/**
 * Verifies a passkey assertion as a second factor.
 *
 * One Firestore transaction reads the challenge, the credential, its counter
 * and the shared failure budget, and writes all of them back, so a challenge
 * is spent exactly once and two racing requests cannot both use it. The
 * challenge is consumed whether the assertion passes or not. Failures count
 * against the same lockout as TOTP and recovery codes.
 */
export async function verifyPasskeyAssertion(
  uid: string,
  response: AuthenticationResponseJSON,
  rp: RelyingParty,
  purpose: Exclude<ChallengePurpose, "register">,
  binding: string,
) {
  const ref = securityRef(uid);
  const presented = challengeFromClientData(response?.response?.clientDataJSON);

  const outcome = await adminDb.runTransaction(async (tx) => {
    const doc = await readDocIn(tx, uid);
    const now = Date.now();
    const lockedUntil = doc.lockedUntil?.toMillis() ?? 0;

    if ((doc.passkeys ?? []).length === 0) {
      return { kind: "not_enrolled" as const };
    }

    if (isLockedOut(lockedUntil, now)) {
      return { kind: "locked" as const, lockedUntil };
    }

    const decision = evaluateChallenge(doc.passkeyChallenges, { challenge: presented, purpose, binding, now });
    const challenges = pruneChallenges(doc.passkeyChallenges, now);
    if (decision.key) delete challenges[decision.key];

    const fail = (reason: string) => {
      const failure = failureUpdate(doc, now);
      tx.update(ref, { ...failure.fields, passkeyChallenges: challenges });
      return { kind: "invalid" as const, failures: failure.failures, reason };
    };

    if (!decision.ok) {
      return fail(`challenge_${decision.reason}`);
    }

    const passkeys = [...(doc.passkeys ?? [])];
    const stored = findCredential(passkeys, response?.id);

    if (!stored) {
      return fail("unknown_credential");
    }

    let verification;

    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: decision.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
        credential: {
          id: stored.id,
          publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
          counter: stored.counter,
          transports: stored.transports,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail(/counter/i.test(message) ? "clone_suspected" : "assertion_invalid");
    }

    const { newCounter } = verification.authenticationInfo;

    if (!verification.verified) {
      return fail("assertion_invalid");
    }

    if (counterDecision(stored.counter, newCounter) !== "ok") {
      return fail("clone_suspected");
    }

    const index = passkeys.indexOf(stored);
    passkeys[index] = {
      ...stored,
      counter: newCounter,
      lastUsedAt: Timestamp.fromMillis(now),
      backedUp: verification.authenticationInfo.credentialBackedUp,
    };

    tx.update(ref, { passkeys, passkeyChallenges: challenges, failedAttempts: 0, lockedUntil: FieldValue.delete() });
    return { kind: "ok" as const, credentialId: stored.id, name: stored.name };
  });

  if (outcome.kind === "not_enrolled") {
    throw new MfaError("No passkey is registered for this account.", "not_enrolled");
  }

  if (outcome.kind === "locked") {
    throw new MfaError(lockedMessage(outcome.lockedUntil), "locked");
  }

  if (outcome.kind === "invalid") {
    logSecurityEvent("passkey_assertion_failed", uid, { purpose, reason: outcome.reason });
    throw new MfaError(failureMessage(outcome.failures, "The passkey could not be verified"), "invalid");
  }

  logSecurityEvent("passkey_assertion_ok", uid, { purpose, credential: outcome.name });
  return { ok: true, credentialId: outcome.credentialId };
}

/** Options for navigator.credentials.create(). Only call after a fresh second factor. */
export async function createRegistrationOptions(uid: string, userName: string, rp: RelyingParty, binding: string) {
  const doc = ((await securityRef(uid).get()).data() as SecurityDoc | undefined) ?? {};
  const passkeys = doc.passkeys ?? [];

  if (passkeys.length >= MAX_PASSKEYS) {
    throw new Error(`At most ${MAX_PASSKEYS} passkeys can be registered. Remove one first.`);
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName,
    userDisplayName: userName,
    userID: userHandle(uid),
    attestationType: "none",
    timeout: CEREMONY_TIMEOUT_MS,
    excludeCredentials: passkeys.map((passkey) => ({ id: passkey.id, transports: passkey.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });

  await storeChallenge(uid, options.challenge, "register", binding);
  return options;
}

/** Verifies the new credential and stores it, spending the registration challenge in the same transaction. */
export async function finishRegistration(
  uid: string,
  response: RegistrationResponseJSON,
  name: unknown,
  rp: RelyingParty,
  binding: string,
) {
  const ref = securityRef(uid);
  const presented = challengeFromClientData(response?.response?.clientDataJSON);
  const label = sanitizePasskeyName(name);

  const result = await adminDb.runTransaction(async (tx) => {
    const doc = await readDocIn(tx, uid);
    const now = Date.now();
    const decision = evaluateChallenge(doc.passkeyChallenges, { challenge: presented, purpose: "register", binding, now });
    const challenges = pruneChallenges(doc.passkeyChallenges, now);
    if (decision.key) delete challenges[decision.key];

    if (!decision.ok) {
      tx.update(ref, { passkeyChallenges: challenges });
      return { error: "This passkey request expired or was already used. Start again." };
    }

    let verification;

    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: decision.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      });
    } catch {
      verification = null;
    }

    if (!verification?.verified) {
      tx.update(ref, { passkeyChallenges: challenges });
      return { error: "The passkey could not be verified." };
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;
    const passkeys = doc.passkeys ?? [];

    if (findCredential(passkeys, credential.id)) {
      tx.update(ref, { passkeyChallenges: challenges });
      return { error: "This passkey is already registered." };
    }

    if (passkeys.length >= MAX_PASSKEYS) {
      tx.update(ref, { passkeyChallenges: challenges });
      return { error: `At most ${MAX_PASSKEYS} passkeys can be registered.` };
    }

    const record: StoredPasskey = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? [],
      name: label,
      createdAt: Timestamp.fromMillis(now),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      aaguid,
    };

    tx.update(ref, { passkeys: [...passkeys, record], passkeyChallenges: challenges });
    return { id: credential.id };
  });

  if ("error" in result) {
    logSecurityEvent("passkey_registration_failed", uid, { reason: result.error });
    throw new Error(result.error);
  }

  logSecurityEvent("passkey_registered", uid, { name: label });
  return { id: result.id, name: label };
}

export class PasskeyNotFoundError extends Error {
  constructor() {
    super("That passkey is not registered.");
    this.name = "PasskeyNotFoundError";
  }
}

/** Removes one passkey, unless it is the last second factor left. */
export async function removePasskey(uid: string, id: string) {
  const ref = securityRef(uid);

  const name = await adminDb.runTransaction(async (tx) => {
    const doc = await readDocIn(tx, uid);
    const target = findCredential(doc.passkeys, id);

    if (!target) {
      throw new PasskeyNotFoundError();
    }

    if (!canRemoveFactor(factorsOf(doc), { kind: "passkey", id })) {
      throw new LastFactorError();
    }

    tx.update(ref, { passkeys: (doc.passkeys ?? []).filter((passkey) => passkey.id !== id) });
    return target.name;
  });

  logSecurityEvent("passkey_removed", uid, { name });
}
