import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHALLENGE_TTL_MS,
  LOCKOUT_MS,
  MAX_FAILURES,
  MAX_PENDING_CHALLENGES,
  addChallenge,
  canRemoveFactor,
  challengeBinding,
  challengeFromClientData,
  challengeKey,
  counterDecision,
  evaluateChallenge,
  findCredential,
  hasAnyFactor,
  isLockedOut,
  nextFailureState,
  pruneChallenges,
  resolveRelyingParty,
  sanitizePasskeyName,
  type ChallengeMap,
} from "../lib/auth/passkey-policy";

const SITE = "https://pstepanov.dev";

describe("resolveRelyingParty", () => {
  it("uses the canonical site in production whatever the Host header says", () => {
    for (const host of ["evil.example", "localhost:3000", "pstepanov.dev.evil.example", null]) {
      assert.deepEqual(
        resolveRelyingParty({ nodeEnv: "production", configuredIssuer: undefined, siteUrl: SITE, host }),
        { rpID: "pstepanov.dev", origin: "https://pstepanov.dev" },
      );
    }
  });

  it("prefers OAUTH_ISSUER when it is set, trailing slash or not", () => {
    assert.deepEqual(
      resolveRelyingParty({ nodeEnv: "production", configuredIssuer: " https://preview.pstepanov.dev/ ", siteUrl: SITE, host: "evil.example" }),
      { rpID: "preview.pstepanov.dev", origin: "https://preview.pstepanov.dev" },
    );
  });

  it("trusts only localhost in development", () => {
    assert.deepEqual(
      resolveRelyingParty({ nodeEnv: "development", configuredIssuer: undefined, siteUrl: SITE, host: "localhost:3000" }),
      { rpID: "localhost", origin: "http://localhost:3000" },
    );
    assert.deepEqual(
      resolveRelyingParty({ nodeEnv: "development", configuredIssuer: undefined, siteUrl: SITE, host: "192.168.1.20:3000" }),
      { rpID: "pstepanov.dev", origin: SITE },
    );
    assert.deepEqual(
      resolveRelyingParty({ nodeEnv: "development", configuredIssuer: undefined, siteUrl: SITE, host: "localhost.evil.example" }),
      { rpID: "pstepanov.dev", origin: SITE },
    );
  });

  it("refuses a plain-http origin that is not localhost", () => {
    assert.throws(() => resolveRelyingParty({ nodeEnv: "production", configuredIssuer: "http://pstepanov.dev", siteUrl: SITE, host: null }));
  });
});

describe("challenges", () => {
  const now = 1_700_000_000_000;
  const binding = challengeBinding("nonce-a", "session-1");

  it("binds to both the nonce and the session", () => {
    assert.notEqual(challengeBinding("nonce-a", "session-1"), challengeBinding("nonce-b", "session-1"));
    assert.notEqual(challengeBinding("nonce-a", "session-1"), challengeBinding("nonce-a", "session-2"));
    assert.equal(challengeBinding("nonce-a"), challengeBinding("nonce-a", null));
  });

  it("accepts a live challenge once for the right purpose and binding", () => {
    const map = addChallenge({}, { challenge: "abc", purpose: "sign-in", binding }, now);
    const decision = evaluateChallenge(map, { challenge: "abc", purpose: "sign-in", binding, now: now + 1000 });
    assert.deepEqual(decision, { ok: true, key: challengeKey("abc"), challenge: "abc" });
  });

  it("rejects unknown, expired, misused, and foreign challenges, and still names them for consumption", () => {
    const map = addChallenge({}, { challenge: "abc", purpose: "step-up", binding }, now);

    assert.deepEqual(evaluateChallenge(map, { challenge: "zzz", purpose: "step-up", binding, now }), { ok: false, key: null, reason: "unknown" });
    assert.deepEqual(evaluateChallenge(map, { challenge: null, purpose: "step-up", binding, now }), { ok: false, key: null, reason: "unknown" });
    assert.deepEqual(
      evaluateChallenge(map, { challenge: "abc", purpose: "step-up", binding, now: now + CHALLENGE_TTL_MS }),
      { ok: false, key: challengeKey("abc"), reason: "expired" },
    );
    assert.deepEqual(
      evaluateChallenge(map, { challenge: "abc", purpose: "sign-in", binding, now }),
      { ok: false, key: challengeKey("abc"), reason: "wrong_purpose" },
    );
    assert.deepEqual(
      evaluateChallenge(map, { challenge: "abc", purpose: "step-up", binding: challengeBinding("nonce-a", "other"), now }),
      { ok: false, key: challengeKey("abc"), reason: "wrong_binding" },
    );
  });

  it("is single use once the caller deletes the key", () => {
    const map: ChallengeMap = addChallenge({}, { challenge: "abc", purpose: "register", binding }, now);
    const first = evaluateChallenge(map, { challenge: "abc", purpose: "register", binding, now });
    assert.equal(first.ok, true);
    delete map[first.key!];
    assert.equal(evaluateChallenge(map, { challenge: "abc", purpose: "register", binding, now }).ok, false);
  });

  it("prunes expired entries and caps how many stay pending", () => {
    let map: ChallengeMap = { stale: { challenge: "old", purpose: "sign-in", binding, expiresAt: now - 1 } };

    for (let index = 0; index < MAX_PENDING_CHALLENGES + 3; index += 1) {
      map = addChallenge(map, { challenge: `c${index}`, purpose: "sign-in", binding }, now + index);
    }

    assert.equal(Object.keys(map).length, MAX_PENDING_CHALLENGES);
    assert.equal(map.stale, undefined);
    assert.ok(map[challengeKey(`c${MAX_PENDING_CHALLENGES + 2}`)], "the newest challenge survives");
    assert.equal(Object.keys(pruneChallenges(map, now + CHALLENGE_TTL_MS + 100)).length, 0);
  });

  it("reads the challenge out of clientDataJSON and tolerates junk", () => {
    const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: "abc", origin: SITE })).toString("base64url");
    assert.equal(challengeFromClientData(clientData), "abc");
    assert.equal(challengeFromClientData("not base64 json"), null);
    assert.equal(challengeFromClientData(undefined), null);
    assert.equal(challengeFromClientData("x".repeat(5000)), null);
  });
});

describe("credentials", () => {
  const credentials = [{ id: "a", name: "Mac" }, { id: "b", name: "Phone" }];

  it("selects a credential by exact id only", () => {
    assert.equal(findCredential(credentials, "b")?.name, "Phone");
    assert.equal(findCredential(credentials, "B"), null);
    assert.equal(findCredential(credentials, ""), null);
    assert.equal(findCredential(credentials, 42), null);
    assert.equal(findCredential(undefined, "a"), null);
  });

  it("flags a counter that does not move forward", () => {
    assert.equal(counterDecision(0, 0), "ok", "synced passkeys report zero");
    assert.equal(counterDecision(0, 1), "ok");
    assert.equal(counterDecision(5, 6), "ok");
    assert.equal(counterDecision(5, 5), "clone_suspected");
    assert.equal(counterDecision(5, 3), "clone_suspected");
    assert.equal(counterDecision(5, 0), "clone_suspected");
  });

  it("cleans passkey names", () => {
    assert.equal(sanitizePasskeyName("  MacBook​   Touch ID \n"), "MacBook Touch ID");
    assert.equal(sanitizePasskeyName(""), "Passkey");
    assert.equal(sanitizePasskeyName(null), "Passkey");
    assert.equal(sanitizePasskeyName("x".repeat(200)).length, 60);
  });
});

describe("factors", () => {
  it("counts either factor as enrolled", () => {
    assert.equal(hasAnyFactor({ totp: false, passkeyIds: [] }), false);
    assert.equal(hasAnyFactor({ totp: true, passkeyIds: [] }), true);
    assert.equal(hasAnyFactor({ totp: false, passkeyIds: ["a"] }), true);
  });

  it("never removes the last second factor", () => {
    assert.equal(canRemoveFactor({ totp: true, passkeyIds: [] }, { kind: "totp" }), false);
    assert.equal(canRemoveFactor({ totp: false, passkeyIds: ["a"] }, { kind: "passkey", id: "a" }), false);
    assert.equal(canRemoveFactor({ totp: true, passkeyIds: ["a"] }, { kind: "totp" }), true);
    assert.equal(canRemoveFactor({ totp: true, passkeyIds: ["a"] }, { kind: "passkey", id: "a" }), true);
    assert.equal(canRemoveFactor({ totp: false, passkeyIds: ["a", "b"] }, { kind: "passkey", id: "a" }), true);
    assert.equal(canRemoveFactor({ totp: false, passkeyIds: ["a"] }, { kind: "passkey", id: "missing" }), true);
  });
});

describe("lockout", () => {
  const now = 1_700_000_000_000;

  it("locks after the fifth failure and resets the count", () => {
    let attempts: number | undefined;

    for (let index = 1; index < MAX_FAILURES; index += 1) {
      const next = nextFailureState(attempts, now);
      assert.equal(next.lockedUntil, null);
      attempts = next.failedAttempts;
    }

    const locking = nextFailureState(attempts, now);
    assert.equal(locking.failures, MAX_FAILURES);
    assert.equal(locking.failedAttempts, 0);
    assert.equal(locking.lockedUntil, now + LOCKOUT_MS);
  });

  it("knows when a lock has run out", () => {
    assert.equal(isLockedOut(now + 1, now), true);
    assert.equal(isLockedOut(now, now), false);
    assert.equal(isLockedOut(undefined, now), false);
  });
});
