import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { isEncryptionConfigured } from "@/lib/connections/crypto";
import {
  GOOGLE_CALLBACK_PATH,
  buildGoogleAuthUrl,
  isGoogleOAuthConfigured,
} from "@/lib/connections/google";
import { CONNECT_STATE_COOKIE, createConnectState } from "@/lib/connections/state";
import { getConnection, validateAlias } from "@/lib/connections/store";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";
import { getBaseUrl } from "@/lib/oauth/config";

export const runtime = "nodejs";

const startSchema = z.object({
  alias: z.string().trim().max(40).optional(),
  reconnectId: z.string().trim().optional(),
});


/**
 * Begins the Google consent flow. Returns the URL for the browser to visit
 * and sets the cookie half of the state binding; the callback accepts nothing
 * that does not present both halves.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!isGoogleOAuthConfigured()) {
    return jsonError(
      "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
      503,
    );
  }

  if (!isEncryptionConfigured()) {
    return jsonError(
      "CONNECTIONS_ENCRYPTION_KEY is not configured. Generate one with: openssl rand -base64 32",
      503,
    );
  }

  try {
    const input = startSchema.parse(await request.json().catch(() => ({})));
    const alias = input.alias ? validateAlias(input.alias) : undefined;

    // Reconnecting an existing mailbox pre-fills the Google account chooser so
    // the wrong account cannot quietly be attached to the old record.
    const reconnecting = input.reconnectId
      ? await getConnection(input.reconnectId)
      : null;

    const { nonce, state } = createConnectState({
      alias,
      loginHint: reconnecting?.email,
      reconnectId: reconnecting?.id,
      adminUid: session.uid,
    });

    const url = buildGoogleAuthUrl({
      redirectUri: `${getBaseUrl(request)}${GOOGLE_CALLBACK_PATH}`,
      state,
      loginHint: reconnecting?.email,
    });

    const response = NextResponse.json({ url });
    response.cookies.set({
      name: CONNECT_STATE_COOKIE,
      value: nonce,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: GOOGLE_CALLBACK_PATH,
      maxAge: 600,
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to start the Google connection.",
      400,
    );
  }
}
