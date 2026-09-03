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
 * (one per grant, rotated on use) joined to the client registry and the
 * activity log.
 */
export async function listConnectedClients(
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
  const names = new Map(clientDocs.map((doc) => [doc.id, String((doc.data() as Record<string, unknown> | undefined)?.clientName ?? "Unknown client")]));

  // Last use: newest activity row per client (Firestore "in" caps at 30 ids).
  const lastUsed = new Map<string, string>();
  for (let index = 0; index < clientIds.length; index += 30) {
    const chunk = clientIds.slice(index, index + 30);
    const activity = await adminDb
      .collection("activity")
      .where("clientId", "in", chunk)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    for (const doc of activity.docs) {
      const data = doc.data() as Record<string, unknown>;
      const id = String(data.clientId);
      if (!lastUsed.has(id)) lastUsed.set(id, toIso(data.createdAt) ?? "");
    }
  }

  return Array.from(grants.values())
    .map((grant) => ({
      ...grant,
      clientName: names.get(grant.clientId) ?? "Unknown client",
      lastUsedAt: lastUsed.get(grant.clientId) || undefined,
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
