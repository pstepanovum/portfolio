import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_CALLBACK_PATH,
  GoogleAuthError,
  exchangeCodeForTokens,
} from "@/lib/connections/google";
import { getProfile } from "@/lib/connections/gmail";
import { CONNECT_STATE_COOKIE, readConnectState } from "@/lib/connections/state";
import { getConnection, upsertGoogleConnection } from "@/lib/connections/store";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/firebase/auth";
import { getBaseUrl } from "@/lib/oauth/config";

export const runtime = "nodejs";

const DASHBOARD_PATH = "/dashboard/connections/gmail";

function redirectToDashboard(request: NextRequest, params: Record<string, string>) {
  const url = new URL(DASHBOARD_PATH, getBaseUrl(request));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set({
    name: CONNECT_STATE_COOKIE,
    value: "",
    path: GOOGLE_CALLBACK_PATH,
    maxAge: 0,
  });

  return response;
}

/**
 * Google returns here after consent. The admin session is required again so a
 * stolen callback link cannot attach a mailbox to the dashboard, and the state
 * must match the cookie set when the flow started.
 */
export async function GET(request: NextRequest) {
  const session = await verifyAdminSessionCookie(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!session) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(DASHBOARD_PATH)}`, getBaseUrl(request)),
      { status: 303 },
    );
  }

  const query = request.nextUrl.searchParams;
  const state = readConnectState(
    query.get("state"),
    request.cookies.get(CONNECT_STATE_COOKIE)?.value,
  );

  if (!state || state.adminUid !== session.uid) {
    return redirectToDashboard(request, {
      error: "The connection request expired or did not originate here. Start again.",
    });
  }

  const googleError = query.get("error");

  if (googleError) {
    return redirectToDashboard(request, {
      error:
        googleError === "access_denied"
          ? "Google access was denied, so nothing was connected."
          : `Google returned an error: ${googleError}.`,
    });
  }

  const code = query.get("code");

  if (!code) {
    return redirectToDashboard(request, { error: "Google did not return an authorization code." });
  }

  try {
    const tokens = await exchangeCodeForTokens(
      code,
      `${getBaseUrl(request)}${GOOGLE_CALLBACK_PATH}`,
    );

    if (!tokens.refreshToken) {
      return redirectToDashboard(request, {
        error:
          "Google did not issue a refresh token. Remove the app's access at myaccount.google.com/permissions and connect again.",
      });
    }

    const profile = await getProfile(tokens.accessToken);

    if (state.reconnectId) {
      const expected = await getConnection(state.reconnectId);

      if (expected && expected.email.toLowerCase() !== profile.emailAddress.toLowerCase()) {
        return redirectToDashboard(request, {
          error: `You signed in as ${profile.emailAddress}, but were reconnecting ${expected.email}. Nothing was changed.`,
        });
      }
    }

    const connection = await upsertGoogleConnection({
      email: profile.emailAddress,
      alias: state.alias,
      scopes: tokens.scope.split(/\s+/).filter(Boolean),
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });

    return redirectToDashboard(request, { connected: connection.email });
  } catch (error) {
    const message =
      error instanceof GoogleAuthError || error instanceof Error
        ? error.message
        : "Unable to complete the Google connection.";

    return redirectToDashboard(request, { error: message });
  }
}
