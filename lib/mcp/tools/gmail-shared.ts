import "server-only";

import { z } from "zod";
import { GmailApiError } from "@/lib/connections/gmail";
import { GoogleAuthError } from "@/lib/connections/google";
import {
  AccountResolutionError,
  getAccessTokenForConnection,
  resolveConnection,
  touchConnection,
} from "@/lib/connections/store";
import { errorResult, jsonResult } from "@/lib/mcp/format";
import type { EmailConnection } from "@/types/content";

export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export const DESTRUCTIVE = { ...WRITE, destructiveHint: true } as const;
export const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true } as const;

export const accountField = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    "Which connected mailbox to use: its alias, email address, or id. Optional when exactly one account is connected; required otherwise. Call list_email_accounts to see them.",
  );

export const recipients = z.array(z.string().trim().email()).max(50);

export const outgoingFields = {
  to: recipients.min(1),
  cc: recipients.optional(),
  bcc: recipients.optional(),
  subject: z.string().trim().min(1).max(250),
  body: z.string().min(1).max(100000),
  isHtml: z.boolean().optional().describe("Set when body is HTML."),
};

/**
 * Every mailbox tool goes through here: resolve which account was meant, get a
 * live token, run, and translate failures into results the model can act on.
 * A dead refresh token in particular must read as "reconnect on the dashboard"
 * rather than as a generic API failure, and a 403 after the scope change must
 * point at the same fix.
 */
export async function withAccount<T>(
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

    return jsonResult({ account: connection.alias, email: connection.email, ...data });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return errorResult(
        error.requiresReconnect
          ? `${connection.email} needs to be reconnected at /dashboard/connections before it can be used.`
          : `Google authentication failed for ${connection.email}: ${error.message}`,
      );
    }

    if (error instanceof GmailApiError) {
      const hint = connection.needsReconsent
        ? " This account was connected with a narrower permission set; reconnect it at /dashboard/connections to grant full access."
        : error.status === 401 || error.status === 403
          ? " The account may need to be reconnected at /dashboard/connections."
          : "";

      return errorResult(`Gmail API error for ${connection.email}: ${error.message}.${hint}`);
    }

    return errorResult(error instanceof Error ? error.message : "The mailbox request failed.");
  }
}

/** HTML bodies are large and rarely useful to a model; text is the default. */
export function withoutHtml<T extends { bodyHtml?: string }>(message: T) {
  const copy = { ...message };
  delete copy.bodyHtml;
  return copy;
}
