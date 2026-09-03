import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/connections/gmail";
import { GoogleAuthError } from "@/lib/connections/google";
import {
  getAccessTokenForConnection,
  getConnection,
  touchConnection,
} from "@/lib/connections/store";
import { requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/**
 * Round-trips to Gmail with a fresh access token. This is also how an expired
 * refresh token is detected outside of tool use: the store flips the record
 * to "expired" and the dashboard offers Reconnect.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const { accessToken } = await getAccessTokenForConnection(id);
    const profile = await getProfile(accessToken);
    await touchConnection(id);

    return NextResponse.json({
      ok: true,
      profile: {
        email: profile.emailAddress,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal,
      },
      connection: await getConnection(id),
    });
  } catch (error) {
    const connection = await getConnection(id);
    const message =
      error instanceof GoogleAuthError || error instanceof Error
        ? error.message
        : "The connection test failed.";

    return NextResponse.json({ ok: false, error: message, connection }, { status: 200 });
  }
}
