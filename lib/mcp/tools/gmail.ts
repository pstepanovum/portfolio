import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildReplyHeaders,
  createDraft,
  getMessage,
  getThread,
  GmailApiError,
  listLabels,
  listMessages,
  modifyMessage,
  sendMessage,
} from "@/lib/connections/gmail";
import { GoogleAuthError } from "@/lib/connections/google";
import {
  AccountResolutionError,
  getAccessTokenForConnection,
  listConnections,
  resolveConnection,
  touchConnection,
} from "@/lib/connections/store";
import { errorResult, jsonResult } from "@/lib/mcp/format";
import type { EmailConnection } from "@/types/content";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const accountField = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    "Which connected mailbox to use: its alias, email address, or id. Optional when exactly one account is connected; required otherwise. Call list_email_accounts to see them.",
  );

const recipients = z.array(z.string().trim().email()).max(50);

/** HTML bodies are large and rarely useful to a model; text is the default. */
function withoutHtml<T extends { bodyHtml?: string }>(message: T) {
  const copy = { ...message };
  delete copy.bodyHtml;
  return copy;
}

function describeAccount(connection: EmailConnection) {
  return { account: connection.alias, email: connection.email };
}

/**
 * Every mailbox tool goes through here: resolve which account was meant, get a
 * live token, run, and translate failures into results the model can act on.
 * A dead refresh token in particular must read as "reconnect on the dashboard"
 * rather than as a generic API failure.
 */
async function withAccount<T>(
  accountRef: string | undefined,
  run: (accessToken: string, connection: EmailConnection) => Promise<T>,
) {
  let connection: EmailConnection;

  try {
    connection = await resolveConnection(accountRef);
  } catch (error) {
    return errorResult(
      error instanceof AccountResolutionError ? error.message : String(error),
    );
  }

  try {
    const { accessToken } = await getAccessTokenForConnection(connection.id);
    const data = await run(accessToken, connection);
    await touchConnection(connection.id);

    return jsonResult({ ...describeAccount(connection), ...data });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return errorResult(
        error.requiresReconnect
          ? `${connection.email} needs to be reconnected at /dashboard/connections before it can be used.`
          : `Google authentication failed for ${connection.email}: ${error.message}`,
      );
    }

    if (error instanceof GmailApiError) {
      return errorResult(
        error.status === 401 || error.status === 403
          ? `Gmail refused the request for ${connection.email} (${error.message}). The account may need to be reconnected at /dashboard/connections.`
          : `Gmail API error for ${connection.email}: ${error.message}`,
      );
    }

    return errorResult(error instanceof Error ? error.message : "The mailbox request failed.");
  }
}

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
          lastUsedAt: connection.lastUsedAt,
          ...(connection.status !== "active"
            ? { note: "Reconnect this account at /dashboard/connections." }
            : {}),
        })),
      });
    },
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
        labelIds: z.array(z.string()).max(10).optional().describe('Restrict to label ids, e.g. ["INBOX"], ["UNREAD"]. Use list_labels for custom label ids.'),
        maxResults: z.number().int().min(1).max(50).optional().describe("Messages per page, 1-50. Default 10."),
        pageToken: z.string().optional().describe("nextPageToken from a previous call."),
        includeSpamTrash: z.boolean().optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ account, ...input }) =>
      withAccount(account, (token) => listMessages(token, input)),
  );

  server.registerTool(
    "get_email",
    {
      title: "Read an email",
      description:
        "Read one message in full: headers, plain-text body (HTML is converted when no text part exists), and attachment metadata.",
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1).describe("The Gmail message id from search_emails."),
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
      description:
        "Read every message in a conversation, oldest first, with bodies. Use before replying so the answer has full context.",
      inputSchema: {
        account: accountField,
        threadId: z.string().trim().min(1).describe("The Gmail thread id."),
      },
      annotations: READ_ONLY,
    },
    async ({ account, threadId }) =>
      withAccount(account, async (token) => {
        const thread = await getThread(token, threadId);

        return {
          thread: {
            id: thread.id,
            messages: thread.messages.map(withoutHtml),
          },
        };
      }),
  );

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
}

export function registerGmailWriteTools(server: McpServer) {
  server.registerTool(
    "send_email",
    {
      title: "Send an email",
      description:
        "Send a new email from a connected account. This is immediate and cannot be undone: confirm recipients, subject, and body with the user first. To answer an existing conversation use reply_to_thread instead.",
      inputSchema: {
        account: accountField,
        to: recipients.min(1),
        cc: recipients.optional(),
        bcc: recipients.optional(),
        subject: z.string().trim().min(1).max(250),
        body: z.string().min(1).max(100000),
        isHtml: z.boolean().optional().describe("Set when body is HTML."),
      },
      annotations: WRITE,
    },
    async ({ account, ...input }) =>
      withAccount(account, async (token, connection) => ({
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
      withAccount(account, async (token, connection) => {
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
    "create_draft",
    {
      title: "Create a draft",
      description:
        "Save a draft in the mailbox without sending it. Use this when the user wants to review in Gmail before anything goes out.",
      inputSchema: {
        account: accountField,
        to: recipients.min(1),
        cc: recipients.optional(),
        bcc: recipients.optional(),
        subject: z.string().trim().min(1).max(250),
        body: z.string().min(1).max(100000),
        isHtml: z.boolean().optional(),
        threadId: z.string().optional().describe("Attach the draft to an existing thread."),
      },
      annotations: { ...WRITE, idempotentHint: false },
    },
    async ({ account, ...input }) =>
      withAccount(account, async (token, connection) => ({
        draft: await createDraft(token, { ...input, from: connection.email }),
      })),
  );

  server.registerTool(
    "modify_labels",
    {
      title: "Change labels on a message",
      description:
        'Add or remove label ids on a message. Common uses: mark read (remove "UNREAD"), archive (remove "INBOX"), star (add "STARRED"). Nothing is deleted.',
      inputSchema: {
        account: accountField,
        messageId: z.string().trim().min(1),
        addLabelIds: z.array(z.string()).max(20).optional(),
        removeLabelIds: z.array(z.string()).max(20).optional(),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ account, messageId, addLabelIds, removeLabelIds }) =>
      withAccount(account, async (token) => ({
        message: await modifyMessage(token, messageId, { addLabelIds, removeLabelIds }),
      })),
  );
}
