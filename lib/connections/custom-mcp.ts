import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";

const COLLECTION = "customMcpServers";
const DISCOVERY_TIMEOUT_MS = 15000;

export type CustomMcpAuthType = "none" | "bearer";

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
  status: "active" | "error";
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
    authType: data.authType === "bearer" ? "bearer" : "none",
    hasToken: typeof data.bearerToken === "string" && data.bearerToken.length > 0,
    status: data.status === "error" ? "error" : "active",
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

async function withClient<T>(
  url: string,
  bearerToken: string | undefined,
  run: (client: Client) => Promise<T>,
) {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : undefined,
  });
  const client = new Client({ name: "pstepanov-admin-mcp", version: "1.0.0" });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("The server did not respond within 15 seconds.")), DISCOVERY_TIMEOUT_MS),
  );

  try {
    await Promise.race([client.connect(transport), timeout]);
    return await Promise.race([run(client), timeout]);
  } finally {
    await client.close().catch(() => undefined);
  }
}

/** Connects once, reads the tool list, disconnects. */
export async function discoverRemoteTools(url: string, bearerToken?: string) {
  return withClient(url, bearerToken, async (client) => {
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
}) {
  const name = input.name.trim();

  if (name.length < 2 || name.length > 60) {
    throw new Error("Name must be between 2 and 60 characters.");
  }

  const url = validateUrl(input.url);
  const token = input.authType === "bearer" ? input.bearerToken?.trim() : undefined;

  if (input.authType === "bearer" && !token) {
    throw new Error("A bearer token is required for bearer authentication.");
  }

  const slug = toSlug(name);
  const existing = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get();

  if (!existing.empty) {
    throw new Error(`A server named "${name}" already exists; choose a different name.`);
  }

  const tools = await discoverRemoteTools(url, token);
  const docRef = adminDb.collection(COLLECTION).doc();

  await docRef.set({
    name,
    slug,
    url,
    authType: input.authType,
    bearerToken: token ? encryptSecret(token) : null,
    toolsJson: JSON.stringify(tools),
    status: "active",
    lastError: null,
    lastDiscoveredAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return normalize(docRef.id, (await docRef.get()).data() as Record<string, unknown>);
}

export async function refreshCustomMcpServer(id: string) {
  const server = await getCustomMcpServer(id);

  if (!server) {
    return null;
  }

  const docRef = adminDb.collection(COLLECTION).doc(id);

  try {
    const tools = await discoverRemoteTools(server.url, await readBearerToken(id));
    await docRef.update({
      toolsJson: JSON.stringify(tools),
      status: "active",
      lastError: FieldValue.delete(),
      lastDiscoveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await docRef.update({
      status: "error",
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
  return withClient(server.url, await readBearerToken(server.id), (client) =>
    client.callTool({ name: toolName, arguments: args }),
  );
}
