import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";
import {
  GoogleAuthError,
  hasFullGmailScopes,
  refreshAccessToken,
} from "@/lib/connections/google";
import type { ConnectionPermissions, EmailConnection, EmailConnectionStatus } from "@/types/content";

const COLLECTION = "connections";
const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60 * 1000;
const ALIAS_PATTERN = /^[\w][\w .-]{0,39}$/;

export class AccountResolutionError extends Error {
  constructor(
    message: string,
    public readonly kind: "none" | "ambiguous" | "unknown",
  ) {
    super(message);
    this.name = "AccountResolutionError";
  }
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function toMillis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

/** Destructive stays off unless the dashboard switched it on for this account. */
function normalizePermissions(value: unknown): ConnectionPermissions {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;

  return {
    write: raw.write !== false,
    destructive: raw.destructive === true,
  };
}

function normalizeConnection(
  id: string,
  data: Record<string, unknown>,
): EmailConnection {
  const status = data.status;
  const scopes = Array.isArray(data.scopes)
    ? data.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];

  return {
    id,
    provider: "google",
    product: "gmail",
    email: cleanString(data.email) || "",
    alias: cleanString(data.alias) || "",
    scopes,
    needsReconsent: !hasFullGmailScopes(scopes),
    permissions: normalizePermissions(data.permissions),
    status:
      status === "expired" || status === "revoked"
        ? status
        : ("active" satisfies EmailConnectionStatus),
    lastError: cleanString(data.lastError),
    lastUsedAt: toIsoString(data.lastUsedAt),
    connectedAt: toIsoString(data.connectedAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function validateAlias(alias: string) {
  const trimmed = alias.trim();

  if (!ALIAS_PATTERN.test(trimmed)) {
    throw new Error(
      "Alias must be 1-40 characters: letters, numbers, spaces, dots, dashes, or underscores.",
    );
  }

  return trimmed;
}

/** Default alias is the mailbox's local part, e.g. "contact" for contact@… */
function defaultAlias(email: string) {
  return email.split("@")[0] || email;
}

export async function listConnections() {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .orderBy("connectedAt", "asc")
    .get();

  return snapshot.docs.map((doc) =>
    normalizeConnection(doc.id, doc.data() as Record<string, unknown>),
  );
}

export async function getConnection(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();

  return snapshot.exists
    ? normalizeConnection(snapshot.id, snapshot.data() as Record<string, unknown>)
    : null;
}

async function findByEmail(email: string) {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("emailLower", "==", email.toLowerCase())
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
}

async function assertAliasAvailable(alias: string, exceptId?: string) {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("aliasLower", "==", alias.toLowerCase())
    .limit(1)
    .get();

  if (!snapshot.empty && snapshot.docs[0].id !== exceptId) {
    throw new Error(`The alias "${alias}" is already used by another account.`);
  }
}

/**
 * Creates the record for a freshly authorised mailbox, or refreshes the tokens
 * on an existing one. Reconnecting the same address never produces a second
 * record, so aliases and history survive the weekly re-auth that Google's
 * Testing status imposes.
 */
export async function upsertGoogleConnection(input: {
  email: string;
  alias?: string;
  scopes: string[];
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
}) {
  const existing = await findByEmail(input.email);
  const alias = input.alias ? validateAlias(input.alias) : undefined;

  if (alias) {
    await assertAliasAvailable(alias, existing?.id);
  }

  const tokenFields = {
    refreshToken: encryptSecret(input.refreshToken),
    accessToken: encryptSecret(input.accessToken),
    accessTokenExpiresAt: Timestamp.fromMillis(
      Date.now() + input.expiresIn * 1000,
    ),
    scopes: input.scopes,
    status: "active",
    lastError: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing) {
    await existing.ref.update({
      ...tokenFields,
      ...(alias ? { alias, aliasLower: alias.toLowerCase() } : {}),
    });

    const snapshot = await existing.ref.get();
    return normalizeConnection(existing.id, snapshot.data() as Record<string, unknown>);
  }

  const resolvedAlias = alias ?? validateAlias(defaultAlias(input.email));
  await assertAliasAvailable(resolvedAlias);

  const docRef = adminDb.collection(COLLECTION).doc();
  await docRef.set({
    provider: "google",
    product: "gmail",
    email: input.email,
    emailLower: input.email.toLowerCase(),
    alias: resolvedAlias,
    aliasLower: resolvedAlias.toLowerCase(),
    ...tokenFields,
    lastError: null,
    connectedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await docRef.get();
  return normalizeConnection(docRef.id, snapshot.data() as Record<string, unknown>);
}

export async function updateConnectionAlias(id: string, alias: string) {
  const validated = validateAlias(alias);
  await assertAliasAvailable(validated, id);

  const docRef = adminDb.collection(COLLECTION).doc(id);
  await docRef.update({
    alias: validated,
    aliasLower: validated.toLowerCase(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await docRef.get();
  return normalizeConnection(id, snapshot.data() as Record<string, unknown>);
}

export async function updateConnectionPermissions(id: string, permissions: Partial<ConnectionPermissions>) {
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const current = await docRef.get();

  if (!current.exists) {
    return null;
  }

  const merged = { ...normalizePermissions((current.data() as Record<string, unknown>).permissions), ...permissions };
  await docRef.update({ permissions: merged, updatedAt: FieldValue.serverTimestamp() });

  return normalizeConnection(id, (await docRef.get()).data() as Record<string, unknown>);
}

/** Deletes the record and hands back the refresh token so it can be revoked. */
export async function deleteConnection(id: string) {
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;
  await docRef.delete();

  try {
    return typeof data.refreshToken === "string"
      ? decryptSecret(data.refreshToken)
      : null;
  } catch {
    return null;
  }
}

export async function markConnectionExpired(id: string, reason: string) {
  await adminDb.collection(COLLECTION).doc(id).update({
    status: "expired",
    lastError: reason,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Returns a live access token, refreshing through Google when the cached one
 * is within a minute of expiry. A dead refresh token flips the record to
 * "expired" so the dashboard shows Reconnect instead of failing silently.
 */
export async function getAccessTokenForConnection(id: string) {
  const docRef = adminDb.collection(COLLECTION).doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new AccountResolutionError("That account is no longer connected.", "unknown");
  }

  const data = snapshot.data() as Record<string, unknown>;
  const connection = normalizeConnection(id, data);

  if (connection.status === "revoked") {
    throw new GoogleAuthError(
      `${connection.email} was disconnected. Reconnect it from the dashboard.`,
      "invalid_grant",
      401,
    );
  }

  const expiresAt = toMillis(data.accessTokenExpiresAt);

  if (
    typeof data.accessToken === "string" &&
    expiresAt - ACCESS_TOKEN_SAFETY_MARGIN_MS > Date.now()
  ) {
    return { accessToken: decryptSecret(data.accessToken), connection };
  }

  if (typeof data.refreshToken !== "string") {
    throw new GoogleAuthError(
      `${connection.email} has no refresh token. Reconnect it from the dashboard.`,
      "invalid_grant",
      401,
    );
  }

  try {
    const refreshed = await refreshAccessToken(decryptSecret(data.refreshToken));

    await docRef.update({
      accessToken: encryptSecret(refreshed.accessToken),
      accessTokenExpiresAt: Timestamp.fromMillis(
        Date.now() + refreshed.expiresIn * 1000,
      ),
      status: "active",
      lastError: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { accessToken: refreshed.accessToken, connection };
  } catch (error) {
    if (error instanceof GoogleAuthError && error.requiresReconnect) {
      await markConnectionExpired(id, error.message);
      throw new GoogleAuthError(
        `${connection.email} needs to be reconnected from the dashboard (${error.message}).`,
        error.code,
        error.status,
      );
    }

    throw error;
  }
}

export async function touchConnection(id: string) {
  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({ lastUsedAt: FieldValue.serverTimestamp() })
    .catch(() => undefined);
}

/**
 * Resolves the `account` an MCP tool was given: an id, an alias, or an email
 * address, case-insensitively. With a single connected account the parameter
 * is optional; with several it is required, and the error names the options.
 */
export async function resolveConnection(reference?: string | null) {
  const connections = await listConnections();
  const needle = reference?.trim().toLowerCase();

  if (!needle) {
    if (connections.length === 1) {
      return connections[0];
    }

    if (connections.length === 0) {
      throw new AccountResolutionError(
        "No Gmail accounts are connected. Connect one at /dashboard/connections.",
        "none",
      );
    }

    throw new AccountResolutionError(
      `Several accounts are connected; pass \`account\` as one of: ${connections
        .map((connection) => `"${connection.alias}" (${connection.email})`)
        .join(", ")}.`,
      "ambiguous",
    );
  }

  const match = connections.find(
    (connection) =>
      connection.id === reference?.trim() ||
      connection.alias.toLowerCase() === needle ||
      connection.email.toLowerCase() === needle,
  );

  if (!match) {
    throw new AccountResolutionError(
      `No connected account matches "${reference}". Known accounts: ${
        connections
          .map((connection) => `"${connection.alias}" (${connection.email})`)
          .join(", ") || "none"
      }.`,
      "unknown",
    );
  }

  return match;
}
