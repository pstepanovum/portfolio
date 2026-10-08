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
