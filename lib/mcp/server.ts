import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withActivityLogging } from "@/lib/mcp/activity";
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
export function buildMcpServer(scopes: string[], clientId = "unknown") {
  const server = withActivityLogging(
    new McpServer(
      {
        name: "pavel-stepanov-portfolio",
        title: "Pavel Stepanov Portfolio",
        version: "1.1.0",
        description: "Projects, certifications, timeline, skills, and resume status from pstepanov.dev.",
        websiteUrl: siteConfig.url,
        icons: [{ src: `${siteConfig.url}/icons/mcp.svg`, mimeType: "image/svg+xml", sizes: ["any"] }],
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
        instructions: INSTRUCTIONS,
      },
    ),
    { server: "portfolio", clientId },
  );

  registerReadTools(server);
  registerResources(server);

  if (hasWriteScope(scopes)) {
    registerWriteTools(server);
  }

  return server;
}
