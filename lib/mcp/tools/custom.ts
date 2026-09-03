import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  callRemoteTool,
  type CustomMcpServer,
  type CustomMcpTool,
} from "@/lib/connections/custom-mcp";
import { errorResult } from "@/lib/mcp/format";

/**
 * Remote servers describe inputs in JSON Schema; the SDK only accepts Zod.
 * Anything the converter cannot express degrades to an open object rather
 * than dropping the tool.
 */
function toZod(tool: CustomMcpTool) {
  try {
    return z.fromJSONSchema(tool.inputSchema as Parameters<typeof z.fromJSONSchema>[0]);
  } catch {
    return z.looseObject({});
  }
}

/** Advertises every discovered remote tool as `<slug>__<tool>` and proxies calls. */
export function registerCustomMcpTools(server: McpServer, remotes: CustomMcpServer[]) {
  for (const remote of remotes) {
    if (remote.status !== "active") {
      continue;
    }

    for (const tool of remote.tools) {
      server.registerTool(
        `${remote.slug}__${tool.name}`,
        {
          title: tool.title ?? `${remote.name}: ${tool.name}`,
          description: `[${remote.name}] ${tool.description ?? tool.name}`,
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
    }
  }
}
