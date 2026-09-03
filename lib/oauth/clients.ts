import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { getMcpResourceUrl, type McpResourceKey } from "@/lib/oauth/config";

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

/** Deletes every token of a grant; the client must re-authorise to continue. */
export async function revokeGrant(grantId: string) {
  const tokens = await adminDb.collection("oauthTokens").where("grantId", "==", grantId).get();
  const batch = adminDb.batch();
  tokens.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return tokens.size;
}
