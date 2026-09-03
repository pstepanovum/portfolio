import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleAppKey } from "@/lib/connections/google-apps";
import {
  registerContactsReadTools,
  registerGmailReadTools,
  registerGmailWriteTools,
} from "@/lib/mcp/tools/gmail";
import {
  registerGmailSettingsReadTools,
  registerGmailSettingsWriteTools,
} from "@/lib/mcp/tools/gmail-settings";
import * as workspace from "@/lib/mcp/tools/google-workspace";
import { registerReadTools as registerPortfolioRead } from "@/lib/mcp/tools/read";
import { registerWriteTools as registerPortfolioWrite } from "@/lib/mcp/tools/write";

export type CatalogTool = {
  name: string;
  title: string;
  description: string;
  scope: string;
  destructive: boolean;
};

type RegisterFn = (server: McpServer) => void;

/**
 * Runs the real registration functions against a recorder instead of a live
 * server, so the dashboard's tool list is generated from the same code that
 * serves the tools and cannot drift from it.
 */
function collect(scope: string, registrars: RegisterFn[]) {
  const entries: CatalogTool[] = [];
  const recorder = {
    registerTool(name: string, config: { title?: string; description?: string; annotations?: { destructiveHint?: boolean } }) {
      entries.push({ name, title: config.title ?? name, description: config.description ?? "", scope, destructive: Boolean(config.annotations?.destructiveHint) });
    },
  } as unknown as McpServer;

  registrars.forEach((register) => register(recorder));
  return entries;
}

const REGISTRARS: Record<GoogleAppKey, { read: RegisterFn[]; write: RegisterFn[]; scope: "gmail" | "google" }> = {
  gmail: { read: [registerGmailReadTools, registerGmailSettingsReadTools, registerContactsReadTools], write: [registerGmailWriteTools, registerGmailSettingsWriteTools], scope: "gmail" },
  calendar: { read: [workspace.registerCalendarReadTools], write: [workspace.registerCalendarWriteTools], scope: "google" },
  drive: { read: [workspace.registerDriveReadTools], write: [workspace.registerDriveWriteTools], scope: "google" },
  sheets: { read: [workspace.registerSheetsReadTools], write: [workspace.registerSheetsWriteTools], scope: "google" },
  docs: { read: [workspace.registerDocsReadTools], write: [workspace.registerDocsWriteTools], scope: "google" },
  tasks: { read: [workspace.registerTasksReadTools], write: [workspace.registerTasksWriteTools], scope: "google" },
  slides: { read: [workspace.registerSlidesReadTools], write: [workspace.registerSlidesWriteTools], scope: "google" },
};

export function getAppToolCatalog(app: GoogleAppKey) {
  const { read, write, scope } = REGISTRARS[app];
  return [...collect(`${scope}:read`, read), ...collect(`${scope}:write`, write)];
}

export function getGmailToolCatalog() {
  return getAppToolCatalog("gmail");
}

/** Read/write registrars for every non-Gmail Google app, for the admin server. */
export const WORKSPACE_REGISTRARS = {
  read: (Object.keys(REGISTRARS) as GoogleAppKey[]).filter((k) => k !== "gmail").flatMap((k) => REGISTRARS[k].read),
  write: (Object.keys(REGISTRARS) as GoogleAppKey[]).filter((k) => k !== "gmail").flatMap((k) => REGISTRARS[k].write),
};

/** The portfolio server's tools, same recorder technique. */
export function getPortfolioToolCatalog() {
  return [...collect("portfolio:read", [registerPortfolioRead]), ...collect("portfolio:write", [registerPortfolioWrite])];
}
