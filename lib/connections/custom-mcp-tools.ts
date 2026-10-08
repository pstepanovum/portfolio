import { gunzipSync, gzipSync } from "node:zlib";

/**
 * How a custom MCP server's discovered tools are stored on its document.
 *
 * They used to be one JSON string, and Firestore caps a single field (and a
 * whole document) at 1 MiB: a remote with a few hundred tools, Swendl's 304
 * for one, overflowed it and the refresh failed outright. Tool schemas are
 * repetitive JSON, so gzip shrinks them by an order of magnitude and they are
 * kept as bytes. Old documents still carrying `toolsJson` keep reading.
 */

/** Leaves room under the 1 MiB document cap for the record's other fields. */
export const MAX_STORED_TOOLS_BYTES = 900 * 1024;

export class ToolsTooLargeError extends Error {
  constructor(toolCount: number, bytes: number) {
    super(
      `This server's ${toolCount} tools are still ${Math.round(bytes / 1024)} KB after compression, over the ${MAX_STORED_TOOLS_BYTES / 1024} KB that fits in one record.`,
    );
    this.name = "ToolsTooLargeError";
  }
}

export function encodeTools<T>(tools: T[]): Buffer {
  const packed = gzipSync(Buffer.from(JSON.stringify(tools), "utf8"));

  if (packed.byteLength > MAX_STORED_TOOLS_BYTES) {
    throw new ToolsTooLargeError(tools.length, packed.byteLength);
  }

  return packed;
}

/** Reads either shape; anything unreadable is treated as no tools. */
export function decodeTools<T>(data: { toolsGz?: unknown; toolsJson?: unknown }): T[] {
  try {
    if (data.toolsGz instanceof Uint8Array) {
      const parsed = JSON.parse(gunzipSync(data.toolsGz).toString("utf8"));
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    }

    if (typeof data.toolsJson === "string") {
      const parsed = JSON.parse(data.toolsJson);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    }
  } catch {
    return [];
  }

  return [];
}

/** Pages of tools/list followed before a remote that never stops paginating is cut off. */
export const MAX_TOOL_PAGES = 50;

/**
 * Follows `nextCursor` through every page of a remote's tool list. The SDK's
 * `listTools` returns one page only, so a paginating remote used to show just
 * its first. A repeated cursor or the page cap ends the walk with what was read.
 */
export async function collectToolPages<T>(
  fetchPage: (cursor: string | undefined, page: number) => Promise<{ tools: T[]; nextCursor?: string }>,
  maxPages = MAX_TOOL_PAGES,
): Promise<T[]> {
  const tools: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(cursor, page);
    tools.push(...result.tools);

    if (!result.nextCursor || seen.has(result.nextCursor)) {
      break;
    }

    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }

  return tools;
}

/**
 * The status a server keeps when re-discovering its tools fails. Rejected
 * credentials mean reconnect. Anything else (a timeout, an outage) leaves a
 * server that has tools from an earlier discovery active, so they stay
 * registered on the connector, rather than dropping every one of them.
 */
export function statusAfterFailedDiscovery(input: {
  previous: "active" | "error" | "pending" | "reauth";
  reauth: boolean;
  storedTools: number;
}): "active" | "error" | "reauth" {
  if (input.reauth || input.previous === "reauth") {
    return "reauth";
  }

  return input.storedTools > 0 && input.previous !== "pending" ? "active" : "error";
}
