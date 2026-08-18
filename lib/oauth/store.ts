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
} as const;

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

/** Refresh tokens rotate: redeeming one deletes it in the same transaction. */
export async function consumeRefreshToken(
  token: string,
): Promise<TokenRecord | null> {
  if (!token) {
    return null;
  }

  const docRef = adminDb.collection(COLLECTIONS.tokens).doc(hashSecret(token));

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as Record<string, unknown>;

    if (data.type !== "refresh") {
      return null;
    }

    transaction.delete(docRef);

    if (toMillis(data.expiresAt) <= Date.now()) {
      return null;
    }

    return {
      clientId: typeof data.clientId === "string" ? data.clientId : "",
      scopes: toStringArray(data.scopes),
      resource: typeof data.resource === "string" ? data.resource : undefined,
      grantId: typeof data.grantId === "string" ? data.grantId : "",
    } satisfies TokenRecord;
  });
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

  const siblings = await adminDb
    .collection(COLLECTIONS.tokens)
    .where("grantId", "==", grantId)
    .get();

  const batch = adminDb.batch();
  siblings.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
