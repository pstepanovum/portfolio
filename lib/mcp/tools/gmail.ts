import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import {
  batchDeleteMessages,
  batchModifyMessages,
  buildMimeMessage,
  buildReplyHeaders,
  createDraft,
  forwardMessage,
  getLabel,
  insertMessage,
  listThreads,
  deleteDraft,
  deleteMessagePermanently,
  deleteThreadPermanently,
  getAttachment,
  getDraft,
  getMessage,
  getProfile,
  getThread,
  listDrafts,
  listHistory,
  listMessages,
  modifyMessage,
  modifyThread,
  sendDraft,
  sendMessage,
  trashMessage,
  trashThread,
  untrashMessage,
  untrashThread,
  updateDraft,
} from "@/lib/connections/gmail";
import { getSelfProfile, listContacts, listOtherContacts, searchContacts } from "@/lib/connections/people";
import { listConnections } from "@/lib/connections/store";
import { jsonResult } from "@/lib/mcp/format";
import {
  DESTRUCTIVE,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  WRITE,
  accountField,
  attachmentsField,
  outgoingFields,
  withAccount,
  withoutHtml,
} from "@/lib/mcp/tools/gmail-shared";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function registerGmailReadTools(server: McpServer) {
  server.registerTool(
    "list_email_accounts",
    {
      title: "List connected email accounts",
      description:
        "List every Gmail account connected to the dashboard, with the alias to pass as `account` to the other mail tools, its address, and whether it currently works. Call this first when more than one account may be connected.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const connections = await listConnections();

      return jsonResult({
        count: connections.length,
        accounts: connections.map((connection) => ({
          account: connection.alias,
          email: connection.email,
          status: connection.status,
          permissions: connection.permissions,
          lastUsedAt: connection.lastUsedAt,
          ...(connection.status !== "active" || connection.needsReconsent
            ? { note: "Reconnect this account at /dashboard/connections." }
            : {}),
        })),
      });
    },
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get mailbox profile",
      description: "Address, total message and thread counts, and the current historyId for incremental sync.",
      inputSchema: { account: accountField },
      annotations: READ_ONLY,
    },
    async ({ account }) => withAccount(account, async (token) => ({ profile: await getProfile(token) })),
  );

  server.registerTool(
    "search_emails",
    {
      title: "Search emails",
      description:
        "Search a connected mailbox with Gmail's query syntax (from:, to:, subject:, is:unread, newer_than:7d, has:attachment, label:...). Returns newest first with subject, sender, date, snippet, and labels; use get_email for the body.",
      inputSchema: {
        account: accountField,
        query: z.string().trim().max(500).optional().describe("Gmail search query. Omit to list the most recent mail."),
        labelIds: z.array(z.string()).max(10).optional().describe('Restrict to label ids, e.g. ["INBOX"], ["UNREAD"].'),
        maxResults: z.number().int().min(1).max(50).optional().describe("Messages per page, 1-50. Default 10."),
        pageToken: z.string().optional(),
        includeSpamTrash: z.boolean().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listMessages(token, input)),
  );

  server.registerTool(
    "get_email",
    {
      title: "Read an email",
      description: "Read one message in full: headers, plain-text body (HTML converted when no text part exists), and attachment metadata.",
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1),
        includeHtml: z.boolean().optional().describe("Also return the raw HTML body."),
      },
      annotations: READ_ONLY,
    },
    async ({ account, messageId, includeHtml }) =>
      withAccount(account, async (token) => {
        const message = await getMessage(token, messageId);
        return { message: includeHtml ? message : withoutHtml(message) };
      }),
  );

  server.registerTool(
    "get_thread",
    {
      title: "Read a thread",
      description: "Read every message in a conversation, oldest first, with bodies. Use before replying so the answer has full context.",
      inputSchema: { account: accountField, threadId: z.string().trim().min(1) },
      annotations: READ_ONLY,
    },
    async ({ account, threadId }) =>
      withAccount(account, async (token) => {
        const thread = await getThread(token, threadId);
        return { thread: { id: thread.id, messages: thread.messages.map(withoutHtml) } };
      }),
  );

  server.registerTool(
    "get_attachment",
    {
      title: "Download an attachment",
      description: "Fetch an attachment's contents as base64 (up to 10 MB). Ids come from get_email or get_thread.",
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1),
        attachmentId: z.string().trim().min(1),
      },
      annotations: READ_ONLY,
    },
    async ({ account, messageId, attachmentId }) =>
      withAccount(account, async (token) => {
        const attachment = await getAttachment(token, messageId, attachmentId);

        if (attachment.size > MAX_ATTACHMENT_BYTES) {
          throw new Error(`Attachment is ${attachment.size} bytes; the limit is ${MAX_ATTACHMENT_BYTES}.`);
        }

        return { attachment };
      }),
  );

  server.registerTool(
    "list_drafts",
    {
      title: "List drafts",
      description: "List saved drafts with their draft ids and message headers.",
      inputSchema: {
        account: accountField,
        query: z.string().trim().max(500).optional(),
        maxResults: z.number().int().min(1).max(50).optional(),
        pageToken: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listDrafts(token, input)),
  );

  server.registerTool(
    "get_draft",
    {
      title: "Read a draft",
      description: "Read a draft's full content by draft id.",
      inputSchema: { account: accountField, draftId: z.string().trim().min(1) },
      annotations: READ_ONLY,
    },
    async ({ account, draftId }) =>
      withAccount(account, async (token) => {
        const draft = await getDraft(token, draftId);
        return { draft: { draftId: draft.draftId, message: withoutHtml(draft.message) } };
      }),
  );

  server.registerTool(
    "list_threads",
    {
      title: "List threads",
      description: "Conversations matching a Gmail query, newest first, with subject, participants, message count, and unread state. Use get_thread for bodies.",
      inputSchema: {
        account: accountField,
        query: z.string().trim().max(500).optional(),
        labelIds: z.array(z.string()).max(10).optional(),
        maxResults: z.number().int().min(1).max(50).optional(),
        pageToken: z.string().optional(),
        includeSpamTrash: z.boolean().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listThreads(token, input)),
  );

  server.registerTool(
    "get_label",
    {
      title: "Get label details",
      description: "One label with its message and thread counts.",
      inputSchema: { account: accountField, labelId: z.string().trim().min(1) },
      annotations: READ_ONLY,
    },
    async ({ account, labelId }) => withAccount(account, async (token) => ({ label: await getLabel(token, labelId) })),
  );

  server.registerTool(
    "list_history",
    {
      title: "List mailbox history",
      description:
        "Changes since a historyId (from get_profile or a previous call): messages added, deleted, and label changes. The basis for incremental sync; if Gmail reports the id is too old, fall back to search_emails.",
      inputSchema: {
        account: accountField,
        startHistoryId: z.string().trim().min(1),
        labelId: z.string().optional(),
        historyTypes: z.array(z.enum(["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"])).optional(),
        maxResults: z.number().int().min(1).max(500).optional(),
        pageToken: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listHistory(token, input)),
  );
}

export function registerContactsReadTools(server: McpServer) {
  server.registerTool(
    "search_contacts",
    {
      title: "Search contacts",
      description:
        "Find people by name, email, or phone across saved contacts and, by default, \"other contacts\" (people emailed but never saved). Use it to resolve a name to an address before sending; never guess an address on a close match.",
      inputSchema: {
        account: accountField,
        query: z.string().trim().min(1).max(200),
        includeOtherContacts: z.boolean().optional().describe("Default true."),
        pageSize: z.number().int().min(1).max(30).optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => searchContacts(token, input)),
  );

  server.registerTool(
    "list_contacts",
    {
      title: "List contacts",
      description: "Page through saved contacts, most recently modified first.",
      inputSchema: {
        account: accountField,
        pageSize: z.number().int().min(1).max(100).optional(),
        pageToken: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listContacts(token, input)),
  );

  server.registerTool(
    "list_other_contacts",
    {
      title: "List other contacts",
      description: "People you have emailed but never saved as contacts.",
      inputSchema: { account: accountField, pageSize: z.number().int().min(1).max(100).optional(), pageToken: z.string().optional() },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) => withAccount(account, (token) => listOtherContacts(token, input)),
  );

  server.registerTool(
    "get_account_profile",
    {
      title: "Get the account holder's profile",
      description: "Name, email addresses, phone numbers, street addresses, birthday, and locale of the connected account's owner.",
      inputSchema: { account: accountField },
      annotations: READ_ONLY,
    },
    async ({ account }) => withAccount(account, async (token) => ({ profile: await getSelfProfile(token) })),
  );
}

export function registerGmailWriteTools(server: McpServer) {
  server.registerTool(
    "send_email",
    {
      title: "Send an email",
      description:
        "Send a new email from a connected account. Immediate and irreversible: confirm recipients, subject, and body with the user first. To answer an existing conversation use reply_to_thread.",
      inputSchema: { account: accountField, ...outgoingFields },
      annotations: WRITE,
    },
    async ({ account, ...input }) =>
      withAccount(account, "write", async (token, connection) => ({
        sent: await sendMessage(token, { ...input, from: connection.email }),
      })),
  );

  server.registerTool(
    "reply_to_thread",
    {
      title: "Reply to a thread",
      description:
        "Reply to the latest message in a conversation, keeping it threaded. Addresses the original sender; replyAll also includes the other recipients. Irreversible: confirm the text with the user first.",
      inputSchema: {
        account: accountField,
        threadId: z.string().trim().min(1),
        body: z.string().min(1).max(100000),
        isHtml: z.boolean().optional(),
        replyAll: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ account, threadId, body, isHtml, replyAll }) =>
      withAccount(account, "write", async (token, connection) => {
        const thread = await getThread(token, threadId);
        const latest = thread.messages[thread.messages.length - 1];

        if (!latest) {
          throw new Error("The thread has no messages to reply to.");
        }

        const headers = buildReplyHeaders(latest, connection.email, Boolean(replyAll));

        return {
          repliedTo: { messageId: latest.id, subject: latest.subject, from: latest.from },
          sent: await sendMessage(token, {
            from: connection.email,
            to: headers.to,
            cc: headers.cc,
            subject: headers.subject,
            body,
            isHtml,
            threadId: headers.threadId,
            inReplyTo: headers.inReplyTo,
            references: headers.references,
          }),
        };
      }),
  );

  server.registerTool(
    "forward_email",
    {
      title: "Forward an email",
      description: "Forward a message to new recipients with an optional note on top; the original's attachments are re-attached unless includeAttachments is false. Irreversible: confirm recipients first.",
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1),
        to: z.array(z.string().trim().email()).min(1).max(50),
        cc: z.array(z.string().trim().email()).max(50).optional(),
        bcc: z.array(z.string().trim().email()).max(50).optional(),
        note: z.string().max(20000).optional(),
        includeAttachments: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ account, ...input }) =>
      withAccount(account, "write", (token, connection) => forwardMessage(token, { ...input, from: connection.email })),
  );

  server.registerTool(
    "create_draft",
    {
      title: "Create a draft",
      description: "Save a draft without sending. Use when the user wants to review in Gmail before anything goes out.",
      inputSchema: {
        account: accountField,
        ...outgoingFields,
        threadId: z.string().optional().describe("Attach the draft to an existing thread."),
      },
      annotations: WRITE,
    },
    async ({ account, ...input }) =>
      withAccount(account, "write", async (token, connection) => ({
        draft: await createDraft(token, { ...input, from: connection.email }),
      })),
  );

  server.registerTool(
    "update_draft",
    {
      title: "Update a draft",
      description: "Replace a draft's entire content. Gmail has no partial update, so supply every field, not just the changed ones.",
      inputSchema: {
        account: accountField,
        draftId: z.string().trim().min(1),
        ...outgoingFields,
        threadId: z.string().optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, draftId, ...input }) =>
      withAccount(account, "write", async (token, connection) => ({
        draft: await updateDraft(token, draftId, { ...input, from: connection.email }),
      })),
  );

  server.registerTool(
    "send_draft",
    {
      title: "Send a draft",
      description: "Send an existing draft as-is. Irreversible: confirm with the user first.",
      inputSchema: { account: accountField, draftId: z.string().trim().min(1) },
      annotations: WRITE,
    },
    async ({ account, draftId }) => withAccount(account, "write", async (token) => ({ sent: await sendDraft(token, draftId) })),
  );

  server.registerTool(
    "delete_draft",
    {
      title: "Delete a draft",
      description: "Discard a draft permanently.",
      inputSchema: { account: accountField, draftId: z.string().trim().min(1) },
      annotations: DESTRUCTIVE,
    },
    async ({ account, draftId }) =>
      withAccount(account, "destructive", async (token) => {
        await deleteDraft(token, draftId);
        return { deleted: true, draftId };
      }),
  );

  server.registerTool(
    "modify_labels",
    {
      title: "Change labels on a message",
      description: 'Add or remove label ids on a message. Mark read (remove "UNREAD"), archive (remove "INBOX"), star (add "STARRED"). Nothing is deleted.',
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1),
        addLabelIds: z.array(z.string()).max(20).optional(),
        removeLabelIds: z.array(z.string()).max(20).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, messageId, ...input }) =>
      withAccount(account, "write", async (token) => ({ message: await modifyMessage(token, messageId, input) })),
  );

  server.registerTool(
    "batch_modify_labels",
    {
      title: "Change labels on many messages",
      description: "Add or remove label ids on up to 1000 messages in one call: bulk mark read, archive, or file.",
      inputSchema: {
        account: accountField,
        messageIds: z.array(z.string().trim().min(1)).min(1).max(1000),
        addLabelIds: z.array(z.string()).max(20).optional(),
        removeLabelIds: z.array(z.string()).max(20).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, messageIds, ...input }) =>
      withAccount(account, "write", async (token) => {
        await batchModifyMessages(token, messageIds, input);
        return { modified: messageIds.length };
      }),
  );

  server.registerTool(
    "batch_delete_messages",
    {
      title: "Permanently delete many messages",
      description: "Bypasses Trash for up to 1000 messages at once. NO recovery. Prefer batch_modify_labels with removeLabelIds [\"INBOX\"] or trash_message; confirm explicitly first.",
      inputSchema: { account: accountField, messageIds: z.array(z.string().trim().min(1)).min(1).max(1000) },
      annotations: DESTRUCTIVE,
    },
    async ({ account, messageIds }) =>
      withAccount(account, "destructive", async (token) => {
        await batchDeleteMessages(token, messageIds);
        return { deleted: messageIds.length };
      }),
  );

  server.registerTool(
    "insert_message",
    {
      title: "Insert a message into the mailbox",
      description: "Place a message in the mailbox without sending it (archiving a record, migrating mail). mode \"insert\" skips filters and spam checks and takes label ids; \"import\" runs normal delivery. Builds the MIME from fields or takes a raw base64url RFC 822 message.",
      inputSchema: {
        account: accountField,
        mode: z.enum(["insert", "import"]).optional(),
        raw: z.string().optional().describe("base64url-encoded RFC 822 message; overrides the fields below."),
        from: z.string().optional(),
        to: z.array(z.string().email()).optional(),
        subject: z.string().max(250).optional(),
        body: z.string().max(100000).optional(),
        isHtml: z.boolean().optional(),
        attachments: attachmentsField,
        labelIds: z.array(z.string()).max(20).optional(),
        neverMarkSpam: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async ({ account, mode, raw, labelIds, neverMarkSpam, ...fields }) =>
      withAccount(account, "write", async (token, connection) => {
        const encoded =
          raw ??
          buildMimeMessage({
            from: fields.from ?? connection.email,
            to: fields.to ?? [connection.email],
            subject: fields.subject ?? "(no subject)",
            body: fields.body ?? "",
            isHtml: fields.isHtml,
            attachments: fields.attachments,
          });
        return { message: await insertMessage(token, { raw: encoded, mode: mode ?? "insert", labelIds, neverMarkSpam }) };
      }),
  );

  server.registerTool(
    "modify_thread_labels",
    {
      title: "Change labels on a whole thread",
      description: "Add or remove label ids on every message in a thread at once.",
      inputSchema: {
        account: accountField,
        threadId: z.string().trim().min(1),
        addLabelIds: z.array(z.string()).max(20).optional(),
        removeLabelIds: z.array(z.string()).max(20).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ account, threadId, ...input }) =>
      withAccount(account, "write", async (token) => ({ thread: await modifyThread(token, threadId, input) })),
  );

  const idTool = (
    name: string,
    title: string,
    description: string,
    field: "messageId" | "threadId",
    run: (token: string, id: string) => Promise<unknown>,
    annotations: ToolAnnotations,
  ) =>
    server.registerTool(
      name,
      { title, description, inputSchema: { account: accountField, [field]: z.string().trim().min(1) }, annotations },
      async (args) =>
        withAccount(args.account as string | undefined, annotations.destructiveHint ? "destructive" : "write", async (token) => ({
          result: (await run(token, args[field] as string)) ?? { done: true, [field]: args[field] },
        })),
    );

  idTool("trash_message", "Move a message to Trash", "Recoverable for 30 days via untrash_message.", "messageId", trashMessage, IDEMPOTENT_WRITE);
  idTool("untrash_message", "Restore a message from Trash", "Moves a trashed message back to the mailbox.", "messageId", untrashMessage, IDEMPOTENT_WRITE);
  idTool("trash_thread", "Move a thread to Trash", "Trashes every message in the thread; recoverable via untrash_thread.", "threadId", trashThread, IDEMPOTENT_WRITE);
  idTool("untrash_thread", "Restore a thread from Trash", "Restores every message in a trashed thread.", "threadId", untrashThread, IDEMPOTENT_WRITE);
  idTool(
    "delete_message_permanently",
    "Permanently delete a message",
    "Bypasses Trash. There is NO recovery. Prefer trash_message unless the user explicitly asks for permanent deletion, and confirm first.",
    "messageId",
    deleteMessagePermanently,
    DESTRUCTIVE,
  );
  idTool(
    "delete_thread_permanently",
    "Permanently delete a thread",
    "Bypasses Trash for every message in the thread. There is NO recovery. Confirm with the user first.",
    "threadId",
    deleteThreadPermanently,
    DESTRUCTIVE,
  );
}
