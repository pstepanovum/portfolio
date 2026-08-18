import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerResources } from "@/lib/mcp/resources";
import { registerReadTools } from "@/lib/mcp/tools/read";
import { registerWriteTools } from "@/lib/mcp/tools/write";
import { hasWriteScope } from "@/lib/oauth/config";
import { siteConfig } from "@/lib/seo";

const INSTRUCTIONS = `This server exposes ${siteConfig.name}'s portfolio at ${siteConfig.url}.

Read tools cover projects, certifications, the About page timeline, and the
skills, values, and tooling authored in code. Call get_portfolio_overview first
when you need broad context.

Write tools create, update, and delete projects, certifications, and timeline
entries; they appear only when the connection was granted the portfolio:write
scope. Changes are live immediately on the public site, so confirm intent before
deleting anything. Images must already be hosted: pass a full URL, or upload
through the dashboard first.`;

/**
 * Builds a server instance for a single request.
 *
 * Write tools are registered only for write-scoped connections, so a read-only
 * client never sees a tool it would be refused for calling.
 */
export function buildMcpServer(scopes: string[]) {
  const server = new McpServer(
    {
      name: "pavel-stepanov-portfolio",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: INSTRUCTIONS,
    },
  );

  registerReadTools(server);
  registerResources(server);

  if (hasWriteScope(scopes)) {
    registerWriteTools(server);
  }

  return server;
}
