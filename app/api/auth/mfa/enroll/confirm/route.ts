import { NextResponse, type NextRequest } from "next/server";
import { confirmEnrollment, issueMfaCookieValue } from "@/lib/auth/mfa";
import { ADMIN_MFA_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, adminCookieOptions, getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** Confirms the authenticator with a live code; returns one-time recovery codes. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request, { allowUnenrolled: true });
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return jsonError("Enter the 6-digit code from your authenticator.", 400);

  try {
    const recoveryCodes = await confirmEnrollment(session.uid, body.code);
    const response = NextResponse.json({ success: true, recoveryCodes });
    // The browser that just enrolled is trusted for the rest of this session.
    response.cookies.set({ name: ADMIN_MFA_COOKIE, value: issueMfaCookieValue(session.uid, ADMIN_SESSION_MAX_AGE_SECONDS), ...adminCookieOptions });
    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to confirm enrollment.", 400);
  }
}
