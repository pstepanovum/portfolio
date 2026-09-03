import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createFilter,
  createLabel,
  deleteFilter,
  deleteLabel,
  getAutoForwarding,
  getFilter,
  getImapSettings,
  getLanguageSettings,
  getPopSettings,
  getSendAs,
  getVacationSettings,
  listFilters,
  listForwardingAddresses,
  listLabels,
  listSendAs,
  stopWatch,
  updateAutoForwarding,
  updateImapSettings,
  updateLabel,
  updateLanguageSettings,
  updatePopSettings,
  updateSendAs,
  updateVacationSettings,
  watchMailbox,
} from "@/lib/connections/gmail";
import {
  DESTRUCTIVE,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  WRITE,
  accountField,
  withAccount,
} from "@/lib/mcp/tools/gmail-shared";

const labelFields = {
  name: z.string().trim().min(1).max(225).optional(),
  labelListVisibility: z.enum(["labelShow", "labelShowIfUnread", "labelHide"]).optional(),
  messageListVisibility: z.enum(["show", "hide"]).optional(),
  color: z
    .object({ textColor: z.string(), backgroundColor: z.string() })
    .optional()
    .describe("Hex colours from Gmail's allowed palette."),
};

/** Strips undefined so PUT/PATCH bodies only carry what was given. */
function compact<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
}

export function registerGmailSettingsReadTools(server: McpServer) {
  server.registerTool(
    "list_labels",
    {
      title: "List labels",
      description: "List the mailbox's labels with ids, including unread counts where Gmail provides them.",
      inputSchema: { account: accountField },
      annotations: READ_ONLY,
    },
    async ({ account }) => withAccount(account, async (token) => ({ labels: await listLabels(token) })),
  );

  const readSetting = (name: string, title: string, description: string, run: (token: string) => Promise<unknown>) =>
    server.registerTool(
      name,
      { title, description, inputSchema: { account: accountField }, annotations: READ_ONLY },
      async ({ account }) => withAccount(account, async (token) => ({ settings: await run(token) })),
    );

  readSetting("get_vacation_settings", "Get vacation responder", "Out-of-office auto-reply configuration.", getVacationSettings);
  readSetting("get_language_settings", "Get language settings", "The mailbox display language.", getLanguageSettings);
  readSetting("get_imap_settings", "Get IMAP settings", "IMAP access configuration.", getImapSettings);
  readSetting("get_pop_settings", "Get POP settings", "POP access configuration.", getPopSettings);
  readSetting("get_auto_forwarding", "Get auto-forwarding", "Whether all mail is auto-forwarded, and where.", getAutoForwarding);
  readSetting("list_forwarding_addresses", "List forwarding addresses", "Addresses verified for forwarding.", listForwardingAddresses);
  readSetting("list_send_as", "List send-as aliases", "Every address this mailbox can send as, with display names and signatures.", listSendAs);
  readSetting("list_filters", "List filters", "Every mail filter with its criteria and actions.", listFilters);

  server.registerTool(
    "get_send_as",
    {
      title: "Get a send-as alias",
      description: "Display name, signature, reply-to, SMTP settings, and verification status for one send-as address.",
      inputSchema: { account: accountField, sendAsEmail: z.string().trim().email() },
      annotations: READ_ONLY,
    },
    async ({ account, sendAsEmail }) => withAccount(account, async (token) => ({ sendAs: await getSendAs(token, sendAsEmail) })),
  );

  server.registerTool(
    "get_filter",
    {
      title: "Get a filter",
      description: "One filter's criteria and actions by id.",
      inputSchema: { account: accountField, filterId: z.string().trim().min(1) },
      annotations: READ_ONLY,
    },
    async ({ account, filterId }) => withAccount(account, async (token) => ({ filter: await getFilter(token, filterId) })),
  );
}

export function registerGmailSettingsWriteTools(server: McpServer) {
  server.registerTool(
    "create_label",
    {
      title: "Create a label",
      description: "Create a user label. Nest with slashes in the name, e.g. \"Clients/Acme\".",
      inputSchema: { account: accountField, ...labelFields, name: z.string().trim().min(1).max(225) },
      annotations: WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ label: await createLabel(token, compact(input) as typeof input) })),
  );

  server.registerTool(
    "update_label",
    {
      title: "Update a label",
      description: "Rename a label or change its visibility or colour.",
      inputSchema: { account: accountField, labelId: z.string().trim().min(1), ...labelFields },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, labelId, ...input }) => withAccount(account, "write", async (token) => ({ label: await updateLabel(token, labelId, compact(input)) })),
  );

  server.registerTool(
    "delete_label",
    {
      title: "Delete a label",
      description: "Delete a user label. Messages keep their other labels; system labels cannot be deleted.",
      inputSchema: { account: accountField, labelId: z.string().trim().min(1) },
      annotations: DESTRUCTIVE,
    },
    async ({ account, labelId }) =>
      withAccount(account, "destructive", async (token) => {
        await deleteLabel(token, labelId);
        return { deleted: true, labelId };
      }),
  );

  server.registerTool(
    "update_vacation_settings",
    {
      title: "Update vacation responder",
      description: "Configure the out-of-office auto-reply. Times are epoch milliseconds; omit them for an open-ended responder.",
      inputSchema: {
        account: accountField,
        enableAutoReply: z.boolean(),
        responseSubject: z.string().max(250).optional(),
        responseBodyPlainText: z.string().max(10000).optional(),
        responseBodyHtml: z.string().max(20000).optional(),
        restrictToContacts: z.boolean().optional(),
        restrictToDomain: z.boolean().optional(),
        startTime: z.string().regex(/^\d+$/).optional(),
        endTime: z.string().regex(/^\d+$/).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ settings: await updateVacationSettings(token, compact(input)) })),
  );

  server.registerTool(
    "update_language_settings",
    {
      title: "Update language settings",
      description: "Set the display language, e.g. \"en\", \"en-GB\", \"ru\". Gmail may pick a close variant.",
      inputSchema: { account: accountField, displayLanguage: z.string().trim().min(2).max(10) },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ settings: await updateLanguageSettings(token, input) })),
  );

  server.registerTool(
    "update_imap_settings",
    {
      title: "Update IMAP settings",
      description: "Enable or disable IMAP and set expunge behaviour and folder size limits.",
      inputSchema: {
        account: accountField,
        enabled: z.boolean().optional(),
        autoExpunge: z.boolean().optional(),
        expungeBehavior: z.enum(["archive", "trash", "deleteForever"]).optional(),
        maxFolderSize: z.number().int().min(0).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ settings: await updateImapSettings(token, compact(input)) })),
  );

  server.registerTool(
    "update_pop_settings",
    {
      title: "Update POP settings",
      description: "Set which mail POP clients may download and what happens to it afterwards.",
      inputSchema: {
        account: accountField,
        accessWindow: z.enum(["disabled", "fromNowOn", "allMail"]).optional(),
        disposition: z.enum(["leaveInInbox", "archive", "trash", "markRead"]).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ settings: await updatePopSettings(token, compact(input)) })),
  );

  server.registerTool(
    "update_send_as",
    {
      title: "Update a send-as alias",
      description:
        "Change the display name, signature (HTML, sanitised by Gmail), reply-to, or default flag for a send-as address. Non-primary aliases on consumer accounts can be read but not always updated.",
      inputSchema: {
        account: accountField,
        sendAsEmail: z.string().trim().email(),
        displayName: z.string().max(200).optional(),
        signature: z.string().max(10000).optional(),
        replyToAddress: z.string().email().optional(),
        isDefault: z.boolean().optional(),
        treatAsAlias: z.boolean().optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, sendAsEmail, ...input }) => withAccount(account, "write", async (token) => ({ sendAs: await updateSendAs(token, sendAsEmail, compact(input)) })),
  );

  server.registerTool(
    "create_filter",
    {
      title: "Create a filter",
      description: "Create a mail filter: matching criteria plus actions such as labelling, archiving, or forwarding to a verified address.",
      inputSchema: {
        account: accountField,
        criteria: z.object({
          from: z.string().optional(),
          to: z.string().optional(),
          subject: z.string().optional(),
          query: z.string().optional(),
          negatedQuery: z.string().optional(),
          hasAttachment: z.boolean().optional(),
          excludeChats: z.boolean().optional(),
          size: z.number().int().optional(),
          sizeComparison: z.enum(["larger", "smaller"]).optional(),
        }),
        action: z.object({
          addLabelIds: z.array(z.string()).optional(),
          removeLabelIds: z.array(z.string()).optional(),
          forward: z.string().email().optional(),
        }),
      },
      annotations: WRITE,
    },
    async ({ account, criteria, action }) =>
      withAccount(account, "write", async (token) => ({
        filter: await createFilter(token, { criteria: compact(criteria), action: compact(action) }),
      })),
  );

  server.registerTool(
    "delete_filter",
    {
      title: "Delete a filter",
      description: "Remove a mail filter by id.",
      inputSchema: { account: accountField, filterId: z.string().trim().min(1) },
      annotations: DESTRUCTIVE,
    },
    async ({ account, filterId }) =>
      withAccount(account, "destructive", async (token) => {
        await deleteFilter(token, filterId);
        return { deleted: true, filterId };
      }),
  );

  server.registerTool(
    "update_auto_forwarding",
    {
      title: "Update auto-forwarding",
      description: "Forward all incoming mail to a verified forwarding address, or turn forwarding off.",
      inputSchema: {
        account: accountField,
        enabled: z.boolean(),
        emailAddress: z.string().email().optional(),
        disposition: z.enum(["leaveInInbox", "archive", "trash", "markRead"]).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ settings: await updateAutoForwarding(token, compact(input)) })),
  );

  server.registerTool(
    "watch_mailbox",
    {
      title: "Start push notifications",
      description:
        "Ask Gmail to publish mailbox changes to a Pub/Sub topic (projects/<project>/topics/<name>) that gmail-api-push@system.gserviceaccount.com may publish to. Expires after 7 days; call again to renew.",
      inputSchema: {
        account: accountField,
        topicName: z.string().regex(/^projects\/[^/]+\/topics\/[^/]+$/),
        labelIds: z.array(z.string()).optional(),
        labelFilterBehavior: z.enum(["include", "exclude"]).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, ...input }) => withAccount(account, "write", async (token) => ({ watch: await watchMailbox(token, input) })),
  );

  server.registerTool(
    "stop_watch",
    {
      title: "Stop push notifications",
      description: "Stop Gmail publishing changes for this mailbox.",
      inputSchema: { account: accountField },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account }) =>
      withAccount(account, "write", async (token) => {
        await stopWatch(token);
        return { stopped: true };
      }),
  );
}
