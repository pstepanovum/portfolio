import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  PLAID_OAUTH_REDIRECT_PATH,
  PLAID_WEBHOOK_PATH,
  PlaidApiError,
  createLinkToken,
  isPlaidConfigured,
} from "@/lib/connections/plaid";
import { getAccessTokenForItem, getPlaidItem } from "@/lib/connections/plaid-store";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { getValidationErrorMessage, jsonError, requireAdminRequest } from "@/lib/firebase/http";
import { getBaseUrl } from "@/lib/oauth/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  /** Our own item id. Present for a reconnect, absent when linking a new bank. */
  itemId: z.string().trim().min(1).max(64).optional(),
});

/**
 * Mints the short-lived token that opens Plaid Link in the browser.
 *
 * The redirect URI is sent on every request because OAuth banks such as Chase
 * and Bank of America refuse to start without one, and it must match the
 * dashboard allowlist exactly.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  if (!isPlaidConfigured()) {
    return jsonError(
      "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET, then reload.",
      503,
    );
  }

  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const input = schema.parse((await request.json().catch(() => null)) ?? {});
    const baseUrl = getBaseUrl(request);
    let accessToken: string | undefined;

    if (input.itemId) {
      const item = await getPlaidItem(input.itemId);

      if (!item) {
        return jsonError("That bank is not linked.", 404);
      }

      accessToken = await getAccessTokenForItem(item.id);
    }

    const redirectUri = `${baseUrl}${PLAID_OAUTH_REDIRECT_PATH}`;

    try {
      const { link_token: linkToken, expiration } = await createLinkToken({
        userId: session.uid,
        redirectUri,
        webhookUrl: `${baseUrl}${PLAID_WEBHOOK_PATH}`,
        accessToken,
      });

      return NextResponse.json({ linkToken, expiration });
    } catch (error) {
      // Plaid's own wording here names no URL, which leaves you guessing which
      // one it wanted. Deliberately not retried without the redirect URI: that
      // would appear to work and then strand every OAuth bank mid sign-in.
      if (error instanceof PlaidApiError && error.errorCode === "INVALID_FIELD" && /redirect/i.test(error.message)) {
        return jsonError(
          `Plaid does not recognise this redirect URI yet. Add exactly "${redirectUri}" under Allowed redirect URIs in the Plaid dashboard (Developers, then API), then try again.`,
          400,
        );
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Unable to start Plaid Link.", 400);
  }
}
