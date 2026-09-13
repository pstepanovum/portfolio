import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZATION_CODE_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/oauth/config";

const COLLECTIONS = {
  clients: "oauthClients",
  codes: "oauthCodes",
  tokens: "oauthTokens",
  grants: "oauthGrants",
} as const;

/**
 * How long a grant lives in total, however often it is refreshed.
 *
 * Refresh tokens rotate and each new one lasts 30 days, so without a ceiling a
 * grant that keeps being used never ends, and neither does a refresh token
 * that was stolen from a device the owner stopped using. Reuse detection
 * catches theft while both parties keep refreshing; this caps the case where
 * only the thief does. Set generously, because reconnecting a client is a
 * chore and reuse detection is the primary control.
 */
export const MAX_GRANT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * A rotated refresh token presented again inside this window is treated as a
 * client retry, not theft.
 *
 * A client that refreshes and loses the response to a network error retries
 * with the token it still holds, which has just been rotated. Revoking the
 * whole grant for that would disconnect a legitimate client without warning.
 */
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;

export type OAuthClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt?: string;
};

export type AuthorizationCodeRecord = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  resource?: string;
  adminUid: string;
};

export type TokenRecord = {
  clientId: string;
  scopes: string[];
  resource?: string;
  grantId: string;
};

export type IssuedTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
};

/**
 * Tokens are stored as SHA-256 digests used as the document id: lookup stays a
 * single keyed read, and a Firestore leak never exposes a usable credential.
 */
function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function generateSecret(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function toMillis(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return typeof value === "number" ? value : 0;
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export async function registerOAuthClient(input: {
  clientName: string;
  redirectUris: string[];
}): Promise<OAuthClient> {
  const clientId = `ps_client_${randomBytes(16).toString("hex")}`;

  await adminDb.collection(COLLECTIONS.clients).doc(clientId).set({
    clientName: input.clientName,
    redirectUris: input.redirectUris,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    clientId,
    clientName: input.clientName,
    redirectUris: input.redirectUris,
  };
}

export async function getOAuthClient(
  clientId: string,
): Promise<OAuthClient | null> {
  if (!clientId) {
    return null;
  }

  const snapshot = await adminDb
    .collection(COLLECTIONS.clients)
    .doc(clientId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  return {
    clientId: snapshot.id,
    clientName:
      typeof data.clientName === "string" ? data.clientName : "MCP Client",
    redirectUris: toStringArray(data.redirectUris),
  };
}

export async function createAuthorizationCode(record: AuthorizationCodeRecord) {
  const code = generateSecret("ps_ac");

  await adminDb
    .collection(COLLECTIONS.codes)
    .doc(hashSecret(code))
    .set({
      clientId: record.clientId,
      redirectUri: record.redirectUri,
      scopes: record.scopes,
      codeChallenge: record.codeChallenge,
      resource: record.resource ?? null,
      adminUid: record.adminUid,
      expiresAt: Timestamp.fromMillis(Date.now() + AUTHORIZATION_CODE_TTL_MS),
      createdAt: FieldValue.serverTimestamp(),
    });

  return code;
}

/**
 * Single-use redemption. The read and delete run in one transaction so two
 * concurrent redemptions of a stolen code cannot both succeed.
 */
export async function consumeAuthorizationCode(
  code: string,
): Promise<AuthorizationCodeRecord | null> {
  if (!code) {
    return null;
  }

  const docRef = adminDb.collection(COLLECTIONS.codes).doc(hashSecret(code));

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      return null;
    }

    transaction.delete(docRef);

    const data = snapshot.data() as Record<string, unknown>;

    if (toMillis(data.expiresAt) <= Date.now()) {
      return null;
    }

    return {
      clientId: typeof data.clientId === "string" ? data.clientId : "",
      redirectUri: typeof data.redirectUri === "string" ? data.redirectUri : "",
      scopes: toStringArray(data.scopes),
      codeChallenge:
        typeof data.codeChallenge === "string" ? data.codeChallenge : "",
      resource: typeof data.resource === "string" ? data.resource : undefined,
      adminUid: typeof data.adminUid === "string" ? data.adminUid : "",
    } satisfies AuthorizationCodeRecord;
  });
}

export async function issueTokenSet(input: {
  clientId: string;
  scopes: string[];
  resource?: string;
  grantId?: string;
}): Promise<IssuedTokenSet> {
  const accessToken = generateSecret("ps_at");
  const refreshToken = generateSecret("ps_rt");
  const isNewGrant = !input.grantId;
  const grantId = input.grantId || randomBytes(16).toString("hex");
  const now = Date.now();

  const shared = {
    clientId: input.clientId,
    scopes: input.scopes,
    resource: input.resource ?? null,
    grantId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();

  if (isNewGrant) {
    batch.set(adminDb.collection(COLLECTIONS.grants).doc(grantId), {
      clientId: input.clientId,
      resource: input.resource ?? null,
      createdAtMs: now,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  batch.set(adminDb.collection(COLLECTIONS.tokens).doc(hashSecret(accessToken)), {
    ...shared,
    type: "access",
    expiresAt: Timestamp.fromMillis(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
  });

  batch.set(adminDb.collection(COLLECTIONS.tokens).doc(hashSecret(refreshToken)), {
    ...shared,
    type: "refresh",
    expiresAt: Timestamp.fromMillis(now + REFRESH_TOKEN_TTL_MS),
  });

  await batch.commit();

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scopes: input.scopes,
  };
}

export async function verifyAccessToken(
  token: string,
): Promise<TokenRecord | null> {
  if (!token) {
    return null;
  }

  const snapshot = await adminDb
    .collection(COLLECTIONS.tokens)
    .doc(hashSecret(token))
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  if (data.type !== "access" || toMillis(data.expiresAt) <= Date.now()) {
    return null;
  }

  return {
    clientId: typeof data.clientId === "string" ? data.clientId : "",
    scopes: toStringArray(data.scopes),
    resource: typeof data.resource === "string" ? data.resource : undefined,
    grantId: typeof data.grantId === "string" ? data.grantId : "",
  };
}

export type RefreshOutcome =
  | { ok: true; tokens: IssuedTokenSet }
  | { ok: false; error: "invalid_grant" | "invalid_scope"; description: string };

/**
 * Redeems a refresh token and issues the next pair, all in one transaction.
 *
 * Doing the redemption and the issuing separately left a gap: a grant revoked
 * between the two still received a fresh pair. Here the grant document is read
 * inside the transaction, and revocation marks that document before deleting
 * tokens, so a concurrent refresh either finishes before the mark and has its
 * tokens swept, or retries after it and is refused.
 *
 * A redeemed token is kept as a tombstone rather than deleted, which is what
 * makes reuse detectable. Presenting a tombstone after the grace window means
 * two parties hold the same refresh token, and the whole grant is revoked; the
 * legitimate client simply reconnects, and a thief loses access either way
 * round, whoever refreshed first (RFC 9700 section 4.14.2).
 */
export async function rotateRefreshToken(input: {
  token: string;
  clientId: string;
  requestedScopes: string[];
}): Promise<RefreshOutcome> {
  const invalid = (description: string): RefreshOutcome => ({ ok: false, error: "invalid_grant", description });

  if (!input.token) {
    return invalid("The refresh token is invalid or expired.");
  }

  const tokens = adminDb.collection(COLLECTIONS.tokens);
  const refreshRef = tokens.doc(hashSecret(input.token));
  let reusedGrantId: string | null = null;

  const outcome = await adminDb.runTransaction(async (tx): Promise<RefreshOutcome> => {
    reusedGrantId = null;
    const snapshot = await tx.get(refreshRef);

    if (!snapshot.exists) {
      return invalid("The refresh token is invalid or expired.");
    }

    const data = snapshot.data() as Record<string, unknown>;
    const now = Date.now();
    const grantId = typeof data.grantId === "string" ? data.grantId : "";

    if (!grantId || data.clientId !== input.clientId) {
      return invalid("The refresh token is invalid or expired.");
    }

    const grantRef = adminDb.collection(COLLECTIONS.grants).doc(grantId);
    const grantSnapshot = await tx.get(grantRef);

    if (data.type === "refresh_rotated") {
      const rotatedAtMs = typeof data.rotatedAtMs === "number" ? data.rotatedAtMs : 0;

      if (now - rotatedAtMs > REFRESH_REUSE_GRACE_MS) {
        tx.set(grantRef, { revokedAtMs: now, revokedReason: "refresh_token_reuse" }, { merge: true });
        reusedGrantId = grantId;
        return invalid("This refresh token was already used. The connection has been revoked; reconnect the client.");
      }

      // A retry inside the grace window: retire the pair issued the first
      // time so only one refresh token stays live, then issue again below.
      if (typeof data.successorRefresh === "string") tx.delete(tokens.doc(data.successorRefresh));
      if (typeof data.successorAccess === "string") tx.delete(tokens.doc(data.successorAccess));
    } else if (data.type !== "refresh") {
      return invalid("The refresh token is invalid or expired.");
    }

    if (toMillis(data.expiresAt) <= now) {
      return invalid("The refresh token is invalid or expired.");
    }

    let createdAtMs: number;

    if (grantSnapshot.exists) {
      const grant = grantSnapshot.data() as Record<string, unknown>;

      if (typeof grant.revokedAtMs === "number") {
        return invalid("This connection has been revoked; reconnect the client.");
      }

      createdAtMs = typeof grant.createdAtMs === "number" ? grant.createdAtMs : now;
    } else {
      // Grants issued before grant records existed. Their lifetime starts now,
      // so no client connected today is cut off by this change.
      createdAtMs = now;
      tx.set(grantRef, { clientId: input.clientId, resource: data.resource ?? null, createdAtMs, legacy: true });
    }

    if (now - createdAtMs > MAX_GRANT_LIFETIME_MS) {
      tx.set(grantRef, { revokedAtMs: now, revokedReason: "max_lifetime" }, { merge: true });
      reusedGrantId = grantId;
      return invalid("This connection reached its maximum age; reconnect the client.");
    }

    const grantedScopes = toStringArray(data.scopes);
    const widened = input.requestedScopes.filter((scope) => !grantedScopes.includes(scope));

    if (widened.length > 0) {
      return { ok: false, error: "invalid_scope", description: "Refresh cannot request scopes beyond the original grant." };
    }

    const scopes = input.requestedScopes.length > 0 ? input.requestedScopes : grantedScopes;
    const accessToken = generateSecret("ps_at");
    const refreshToken = generateSecret("ps_rt");
    const shared = {
      clientId: input.clientId,
      scopes,
      resource: data.resource ?? null,
      grantId,
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(tokens.doc(hashSecret(accessToken)), {
      ...shared,
      type: "access",
      expiresAt: Timestamp.fromMillis(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
    });
    tx.set(tokens.doc(hashSecret(refreshToken)), {
      ...shared,
      type: "refresh",
      expiresAt: Timestamp.fromMillis(now + REFRESH_TOKEN_TTL_MS),
    });
    // The redeemed token becomes a tombstone that remembers its successors, so
    // a later presentation can be told apart from a retry.
    tx.update(refreshRef, {
      type: "refresh_rotated",
      rotatedAtMs: now,
      successorRefresh: hashSecret(refreshToken),
      successorAccess: hashSecret(accessToken),
    });

    return { ok: true, tokens: { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, scopes } };
  });

  if (reusedGrantId) {
    await deleteGrantTokens(reusedGrantId);
  }

  return outcome;
}

/** Firestore rejects a batch over 500 writes. */
const MAX_BATCH_WRITES = 450;

/**
 * Deletes documents in chunks. A grant refreshed hourly keeps a tombstone per
 * refresh for as long as the refresh token would have lived, so it can hold
 * several hundred token documents, more than one batch may carry.
 */
export async function deleteInChunks(refs: FirebaseFirestore.DocumentReference[]) {
  for (let offset = 0; offset < refs.length; offset += MAX_BATCH_WRITES) {
    const batch = adminDb.batch();
    refs.slice(offset, offset + MAX_BATCH_WRITES).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return refs.length;
}

async function deleteGrantTokens(grantId: string) {
  const snapshot = await adminDb.collection(COLLECTIONS.tokens).where("grantId", "==", grantId).get();
  return deleteInChunks(snapshot.docs.map((doc) => doc.ref));
}

/**
 * Revokes a grant: marks it first, then deletes its tokens.
 *
 * The order matters. A refresh reads the grant inside its transaction, so once
 * the mark is written no refresh can issue new tokens for it, and the sweep
 * that follows catches any that finished just before.
 */
export async function revokeGrantById(grantId: string, reason = "revoked") {
  await adminDb
    .collection(COLLECTIONS.grants)
    .doc(grantId)
    .set({ revokedAtMs: Date.now(), revokedReason: reason }, { merge: true });
  return deleteGrantTokens(grantId);
}

/** Revokes the presented token and every sibling token from the same grant. */
export async function revokeToken(token: string) {
  if (!token) {
    return;
  }

  const docRef = adminDb.collection(COLLECTIONS.tokens).doc(hashSecret(token));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return;
  }

  const grantId = (snapshot.data() as Record<string, unknown>).grantId;

  if (typeof grantId !== "string" || !grantId) {
    await docRef.delete();
    return;
  }

  await revokeGrantById(grantId, "client_revoked");
}
