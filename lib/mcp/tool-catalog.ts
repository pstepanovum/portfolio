import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerContactsReadTools,
  registerGmailReadTools,
  registerGmailWriteTools,
} from "@/lib/mcp/tools/gmail";
import {
  registerGmailSettingsReadTools,
  registerGmailSettingsWriteTools,
} from "@/lib/mcp/tools/gmail-settings";

export type CatalogTool = {
  name: string;
  title: string;
  description: string;
  scope: "gmail:read" | "gmail:write";
  destructive: boolean;
};

type RegisterFn = (server: McpServer) => void;

/**
 * Runs the real registration functions against a recorder instead of a live
 * server, so the dashboard's tool list is generated from the same code that
 * serves the tools and cannot drift from it.
 */
function collect(scope: CatalogTool["scope"], registrars: RegisterFn[]) {
  const entries: CatalogTool[] = [];
  const recorder = {
    registerTool(
      name: string,
      config: { title?: string; description?: string; annotations?: { destructiveHint?: boolean } },
    ) {
      entries.push({
        name,
        title: config.title ?? name,
        description: config.description ?? "",
        scope,
        destructive: Boolean(config.annotations?.destructiveHint),
      });
    },
  } as unknown as McpServer;

  registrars.forEach((register) => register(recorder));

  return entries;
}

export function getGmailToolCatalog() {
  return [
    ...collect("gmail:read", [
      registerGmailReadTools,
      registerGmailSettingsReadTools,
      registerContactsReadTools,
    ]),
    ...collect("gmail:write", [registerGmailWriteTools, registerGmailSettingsWriteTools]),
  ];
}
