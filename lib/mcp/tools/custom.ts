import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  callRemoteTool,
  type CustomMcpServer,
  type CustomMcpTool,
} from "@/lib/connections/custom-mcp";
import { errorResult } from "@/lib/mcp/format";

/** Longest description passed on from a remote server. */
const MAX_DESCRIPTION_CHARS = 2000;
/** Deepest schema nesting walked before the rest is treated as an open object. */
const MAX_SCHEMA_DEPTH = 32;

/**
 * Keywords whose values are regular expressions or trigger regex-based checks.
 *
 * Zod compiles a remote schema's `pattern` and runs it on this server against
 * every argument. A remote that declares `^(a+)+$` and then asks the connected
 * model to pass a string of thirty-one "a"s blocked the event loop for about a
 * minute, and each extra character roughly doubles that. This process also
 * serves the public site, so one hostile or careless remote could freeze it.
 * The remote validates its own inputs anyway; this side does not need to.
 */
const REGEX_KEYWORDS = new Set(["pattern", "patternProperties", "format"]);

function stripRegexKeywords(value: unknown, depth = 0): unknown {
  if (depth > MAX_SCHEMA_DEPTH) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripRegexKeywords(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (REGEX_KEYWORDS.has(key)) {
        continue;
      }

      result[key] = stripRegexKeywords(child, depth + 1);
    }

    return result;
  }

  return value;
}

/**
 * Remote servers describe inputs in JSON Schema; the SDK only accepts Zod.
 * Anything the converter cannot express degrades to an open object rather
 * than dropping the tool.
 */
function toZod(tool: CustomMcpTool) {
  try {
    const safeSchema = stripRegexKeywords(tool.inputSchema);
    return z.fromJSONSchema(safeSchema as Parameters<typeof z.fromJSONSchema>[0]);
  } catch {
    return z.looseObject({});
  }
}

/**
 * Advertises every discovered remote tool as `<slug>__<tool>` and proxies calls.
 *
 * Each registration is isolated. The SDK throws when a name is registered
 * twice, and this runs while building the whole apps server, so a single
 * remote returning two tools with the same name used to fail every request on
 * the connector, Gmail and bank tools included. Duplicates are skipped and any
 * other failure drops only the tool that caused it.
 */
export function registerCustomMcpTools(server: McpServer, remotes: CustomMcpServer[]) {
  const registered = new Set<string>();

  for (const remote of remotes) {
    if (remote.status !== "active") {
      continue;
    }

    for (const tool of remote.tools) {
      const name = `${remote.slug}__${tool.name}`;

      if (registered.has(name)) {
        continue;
      }

      const description = `[${remote.name}] ${tool.description ?? tool.name}`;

      try {
        server.registerTool(
          name,
          {
            title: tool.title ?? `${remote.name}: ${tool.name}`,
            description:
              description.length > MAX_DESCRIPTION_CHARS
                ? `${description.slice(0, MAX_DESCRIPTION_CHARS)}...`
                : description,
            inputSchema: toZod(tool),
            annotations: { openWorldHint: true },
          },
          async (args) => {
            try {
              const result = await callRemoteTool(
                remote,
                tool.name,
                (args ?? {}) as Record<string, unknown>,
              );

              return result as { content: { type: "text"; text: string }[]; isError?: boolean };
            } catch (error) {
              return errorResult(
                `${remote.name} failed: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          },
        );
        registered.add(name);
      } catch {
        // A tool this server cannot register is left out; the rest still work.
      }
    }
  }
}
