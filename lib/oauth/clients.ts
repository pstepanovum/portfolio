import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { getMcpResourceUrl, type McpResourceKey } from "@/lib/oauth/config";
import { deleteInChunks, revokeGrantById } from "@/lib/oauth/store";

export type ConnectedClient = {
  grantId: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  connectedAt?: string;
  expiresAt?: string;
  lastUsedAt?: string;
};

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

/**
 * One row per live grant on a server: the client that holds it, what it was
 * granted, when, and when it last called a tool. Built from refresh tokens
 * (one per grant, rotated on use) joined to the client registry, which
 * carries lastUsedAt so no composite index is needed.
 */
export async function listConnectedClients(
  request: { headers: Pick<Headers, "get"> },
  resourceKey: McpResourceKey,
): Promise<ConnectedClient[]> {
  try {
    return await listConnectedClientsUnsafe(request, resourceKey);
  } catch (error) {
    console.error("listConnectedClients failed", error);
    return [];
  }
}

async function listConnectedClientsUnsafe(
  request: { headers: Pick<Headers, "get"> },
  resourceKey: McpResourceKey,
): Promise<ConnectedClient[]> {
  const resource = getMcpResourceUrl(request, resourceKey);
  const now = Date.now();

  const tokens = await adminDb
    .collection("oauthTokens")
    .where("type", "==", "refresh")
    .where("resource", "==", resource)
    .get();

  const grants = new Map<string, ConnectedClient>();

  for (const doc of tokens.docs) {
    const data = doc.data() as Record<string, unknown>;
    const expires = data.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
    if (expires <= now) continue;

    const grantId = String(data.grantId ?? doc.id);
    grants.set(grantId, {
      grantId,
      clientId: String(data.clientId ?? ""),
      clientName: "",
      scopes: Array.isArray(data.scopes) ? data.scopes.map(String) : [],
      connectedAt: toIso(data.createdAt),
      expiresAt: toIso(data.expiresAt),
    });
  }

  if (grants.size === 0) {
    return [];
  }

  const clientIds = Array.from(new Set(Array.from(grants.values()).map((g) => g.clientId))).filter(Boolean);
  const clientDocs = await Promise.all(clientIds.map((id) => adminDb.collection("oauthClients").doc(id).get()));
  const names = new Map<string, string>();
  const lastUsed = new Map<string, string | undefined>();

  for (const doc of clientDocs) {
    const data = (doc.data() as Record<string, unknown> | undefined) ?? {};
    names.set(doc.id, String(data.clientName ?? "Unknown client"));
    lastUsed.set(doc.id, toIso(data.lastUsedAt));
  }

  return Array.from(grants.values())
    .map((grant) => ({
      ...grant,
      clientName: names.get(grant.clientId) ?? "Unknown client",
      lastUsedAt: lastUsed.get(grant.clientId),
    }))
    .sort((a, b) => (b.connectedAt ?? "").localeCompare(a.connectedAt ?? ""));
}

/**
 * Revokes a grant from the dashboard. Marked revoked before its tokens are
 * deleted, so a refresh racing the click cannot mint a pair that survives.
 */
export async function revokeGrant(grantId: string) {
  return revokeGrantById(grantId, "owner_disconnected");
}

/** A client registration, independent of whether it currently holds a grant. */
export type RegisteredClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt?: string;
  lastUsedAt?: string;
};

/**
 * Every registered client, newest first.
 *
 * Most clients register themselves through dynamic registration the first time
 * they connect. Apps that cannot do that need a client id issued by hand, and
 * this is what the dashboard lists so one can be found or created.
 */
export async function listRegisteredClients(): Promise<RegisteredClient[]> {
  const snapshot = await adminDb.collection("oauthClients").get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      return {
        clientId: doc.id,
        clientName: String(data.clientName ?? "Unnamed client"),
        redirectUris: Array.isArray(data.redirectUris) ? data.redirectUris.map(String) : [],
        createdAt: toIso(data.createdAt),
        lastUsedAt: toIso(data.lastUsedAt),
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * Removes a registration along with every token issued to it, so deleting a
 * client id from the dashboard actually cuts the app off rather than leaving
 * live tokens behind.
 */
export async function deleteRegisteredClient(clientId: string) {
  // Every grant this client holds is marked revoked first, for the same reason
  // as revokeGrant: a refresh in flight must not outlive the deletion.
  const grants = await adminDb.collection("oauthGrants").where("clientId", "==", clientId).get();
  await Promise.all(grants.docs.map((grant) => revokeGrantById(grant.id, "client_deleted")));

  const tokens = await adminDb.collection("oauthTokens").where("clientId", "==", clientId).get();
  const codes = await adminDb.collection("oauthCodes").where("clientId", "==", clientId).get();

  await deleteInChunks([
    ...tokens.docs.map((doc) => doc.ref),
    ...codes.docs.map((doc) => doc.ref),
    adminDb.collection("oauthClients").doc(clientId),
  ]);

  return { revokedTokens: tokens.size };
}
