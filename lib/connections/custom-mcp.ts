import "server-only";

import { UnauthorizedError, auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";
import { FirestoreOAuthProvider } from "@/lib/connections/mcp-oauth";

const COLLECTION = "customMcpServers";
const DISCOVERY_TIMEOUT_MS = 15000;

export type CustomMcpAuthType = "none" | "bearer" | "oauth";

export type CustomMcpTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

/** Safe projection; the bearer token never leaves the server. */
export type CustomMcpServer = {
  id: string;
  name: string;
  slug: string;
  url: string;
  authType: CustomMcpAuthType;
  hasToken: boolean;
  /** pending: OAuth consent not completed yet; reauth: tokens rejected, reconnect. */
  status: "active" | "error" | "pending" | "reauth";
  tools: CustomMcpTool[];
  lastError?: string;
  lastDiscoveredAt?: string;
  createdAt?: string;
};

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

/** Tool names are prefixed with this so two servers cannot collide. */
export function toSlug(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return slug || "server";
}

function normalize(id: string, data: Record<string, unknown>): CustomMcpServer {
  let tools: CustomMcpTool[] = [];

  try {
    tools = typeof data.toolsJson === "string" ? (JSON.parse(data.toolsJson) as CustomMcpTool[]) : [];
  } catch {
    tools = [];
  }

  return {
    id,
    name: typeof data.name === "string" ? data.name : "Custom MCP",
    slug: typeof data.slug === "string" ? data.slug : toSlug(String(data.name ?? id)),
    url: typeof data.url === "string" ? data.url : "",
    authType: data.authType === "bearer" ? "bearer" : data.authType === "oauth" ? "oauth" : "none",
    hasToken:
      (typeof data.bearerToken === "string" && data.bearerToken.length > 0) ||
      (typeof data.oauthTokens === "string" && data.oauthTokens.length > 0),
    status:
      data.status === "error" || data.status === "pending" || data.status === "reauth"
        ? data.status
        : "active",
    tools,
    lastError: typeof data.lastError === "string" ? data.lastError : undefined,
    lastDiscoveredAt: toIso(data.lastDiscoveredAt),
    createdAt: toIso(data.createdAt),
  };
}

function validateUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Enter a full URL, for example https://mcp.example.com/mcp.");
  }

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Remote MCP servers must use https.");
  }

  return parsed.toString();
}

type RemoteAuth =
  | { kind: "none" }
  | { kind: "bearer"; token: string }
  | { kind: "oauth"; provider: FirestoreOAuthProvider };

class RemoteReauthRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemoteReauthRequired";
  }
}

async function withClient<T>(url: string, remoteAuth: RemoteAuth, run: (client: Client) => Promise<T>) {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit:
      remoteAuth.kind === "bearer"
        ? { headers: { Authorization: `Bearer ${remoteAuth.token}` } }
        : undefined,
    authProvider: remoteAuth.kind === "oauth" ? remoteAuth.provider : undefined,
  });
  const client = new Client({ name: "pstepanov-admin-mcp", version: "1.0.0" });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("The server did not respond within 15 seconds.")), DISCOVERY_TIMEOUT_MS),
  );

  try {
    await Promise.race([client.connect(transport), timeout]);
    return await Promise.race([run(client), timeout]);
  } catch (error) {
    // The transport already tried a refresh; reaching here means the grant is dead.
    if (error instanceof UnauthorizedError) {
      throw new RemoteReauthRequired("The remote server rejected our credentials; reconnect it from the dashboard.");
    }

    throw error;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function resolveAuth(server: CustomMcpServer, redirectUri?: string): Promise<RemoteAuth> {
  if (server.authType === "bearer") {
    return { kind: "bearer", token: (await readBearerToken(server.id)) ?? "" };
  }

  if (server.authType === "oauth") {
    return { kind: "oauth", provider: new FirestoreOAuthProvider(server.id, redirectUri ?? (await readRedirectUri(server.id))) };
  }

  return { kind: "none" };
}

async function readRedirectUri(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
  const stored = (snapshot.data() as Record<string, unknown> | undefined)?.oauthRedirectUri;

  if (typeof stored !== "string" || !stored) {
    throw new Error("This server has no OAuth redirect URI recorded; remove it and add it again.");
  }

  return stored;
}

/** Connects once, reads the tool list, disconnects. */
export async function discoverRemoteTools(url: string, remoteAuth: RemoteAuth) {
  return withClient(url, remoteAuth, async (client) => {
    const { tools } = await client.listTools();

    return tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: (tool.inputSchema ?? { type: "object" }) as Record<string, unknown>,
    })) satisfies CustomMcpTool[];
  });
}

export async function listCustomMcpServers() {
  const snapshot = await adminDb.collection(COLLECTION).orderBy("createdAt", "asc").get();
  return snapshot.docs.map((doc) => normalize(doc.id, doc.data() as Record<string, unknown>));
}

export async function getCustomMcpServer(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
  return snapshot.exists ? normalize(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

async function readBearerToken(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
  const stored = (snapshot.data() as Record<string, unknown> | undefined)?.bearerToken;
  return typeof stored === "string" && stored ? decryptSecret(stored) : undefined;
}

/**
 * Registers a remote server: validates the URL, discovers its tools so the
 * admin MCP can advertise them without a network hop per request, and stores
 * the bearer token encrypted.
 */
export async function createCustomMcpServer(input: {
  name: string;
  url: string;
  authType: CustomMcpAuthType;
  bearerToken?: string;
  /** Required for OAuth: the absolute callback this deployment answers on. */
  redirectUri?: string;
}): Promise<{ server: CustomMcpServer; authorizeUrl?: string }> {
  const name = input.name.trim();

  if (name.length < 2 || name.length > 60) {
    throw new Error("Name must be between 2 and 60 characters.");
  }

  const url = validateUrl(input.url);
  const token = input.authType === "bearer" ? input.bearerToken?.trim() : undefined;

  if (input.authType === "bearer" && !token) {
    throw new Error("A bearer token is required for bearer authentication.");
  }

  if (input.authType === "oauth" && !input.redirectUri) {
    throw new Error("OAuth connections need a redirect URI.");
  }

  const slug = toSlug(name);
  const existing = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get();

  if (!existing.empty) {
    throw new Error(`A server named "${name}" already exists; choose a different name.`);
  }

  const docRef = adminDb.collection(COLLECTION).doc();
  const base = {
    name,
    slug,
    url,
    authType: input.authType,
    bearerToken: token ? encryptSecret(token) : null,
    oauthRedirectUri: input.redirectUri ?? null,
    lastError: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.authType === "oauth") {
    // Nothing can be discovered until the admin has consented at the remote;
    // the record starts pending and the caller sends the browser to Google-style
    // consent on the remote's authorization server.
    await docRef.set({ ...base, toolsJson: "[]", status: "pending" });
    const server = normalize(docRef.id, (await docRef.get()).data() as Record<string, unknown>);

    return { server, authorizeUrl: await startOAuth(server.id, input.redirectUri as string) };
  }

  const tools = await discoverRemoteTools(url, token ? { kind: "bearer", token } : { kind: "none" });

  await docRef.set({
    ...base,
    toolsJson: JSON.stringify(tools),
    status: "active",
    lastDiscoveredAt: FieldValue.serverTimestamp(),
  });

  return { server: normalize(docRef.id, (await docRef.get()).data() as Record<string, unknown>) };
}

/**
 * Runs the SDK's discovery + dynamic registration + PKCE setup and returns the
 * remote's authorization URL for the browser. Used for the first connection
 * and for every reconnect.
 */
export async function startOAuth(id: string, redirectUri?: string) {
  const server = await getCustomMcpServer(id);

  if (!server || server.authType !== "oauth") {
    throw new Error("This server does not use OAuth.");
  }

  const provider = new FirestoreOAuthProvider(id, redirectUri ?? (await readRedirectUri(id)));

  if (redirectUri) {
    await adminDb.collection(COLLECTION).doc(id).update({ oauthRedirectUri: redirectUri });
  }

  // A reconnect must not silently reuse dead tokens.
  await provider.invalidateCredentials("tokens");

  const result = await auth(provider, { serverUrl: server.url });

  if (result !== "REDIRECT" || !provider.authorizationUrl) {
    throw new Error("The remote server did not require authorization; use the no-auth option instead.");
  }

  return provider.authorizationUrl.toString();
}

/** The callback leg: exchanges the code, then discovers tools with the new tokens. */
export async function completeOAuth(state: string, code: string) {
  const snapshot = await adminDb.collection(COLLECTION).where("oauthState", "==", state).limit(1).get();

  if (snapshot.empty) {
    throw new Error("This authorization does not match a pending connection. Start again from the dashboard.");
  }

  const doc = snapshot.docs[0];
  const server = normalize(doc.id, doc.data() as Record<string, unknown>);
  const provider = new FirestoreOAuthProvider(server.id, await readRedirectUri(server.id));

  const result = await auth(provider, { serverUrl: server.url, authorizationCode: code });

  if (result !== "AUTHORIZED") {
    throw new Error("The remote server did not complete the authorization.");
  }

  await doc.ref.update({ oauthState: FieldValue.delete(), oauthVerifier: FieldValue.delete() });

  try {
    const tools = await discoverRemoteTools(server.url, { kind: "oauth", provider });
    await doc.ref.update({
      toolsJson: JSON.stringify(tools),
      status: "active",
      lastError: FieldValue.delete(),
      lastDiscoveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await doc.ref.update({
      status: "error",
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return normalize(server.id, (await doc.ref.get()).data() as Record<string, unknown>);
}

export async function refreshCustomMcpServer(id: string) {
  const server = await getCustomMcpServer(id);

  if (!server) {
    return null;
  }

  const docRef = adminDb.collection(COLLECTION).doc(id);

  try {
    const tools = await discoverRemoteTools(server.url, await resolveAuth(server));
    await docRef.update({
      toolsJson: JSON.stringify(tools),
      status: "active",
      lastError: FieldValue.delete(),
      lastDiscoveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await docRef.update({
      status: error instanceof RemoteReauthRequired ? "reauth" : "error",
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return normalize(id, (await docRef.get()).data() as Record<string, unknown>);
}

export async function deleteCustomMcpServer(id: string) {
  await adminDb.collection(COLLECTION).doc(id).delete();
}

export async function callRemoteTool(
  server: CustomMcpServer,
  toolName: string,
  args: Record<string, unknown>,
) {
  try {
    return await withClient(server.url, await resolveAuth(server), (client) =>
      client.callTool({ name: toolName, arguments: args }),
    );
  } catch (error) {
    if (error instanceof RemoteReauthRequired) {
      await adminDb
        .collection(COLLECTION)
        .doc(server.id)
        .update({ status: "reauth", lastError: error.message, updatedAt: FieldValue.serverTimestamp() })
        .catch(() => undefined);
    }

    throw error;
  }
}
