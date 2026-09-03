import { NextResponse, type NextRequest } from "next/server";
import { MfaError, disableMfa, verifySecondFactor } from "@/lib/auth/mfa";
import { ADMIN_MFA_COOKIE, adminCookieOptions, getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** Turning MFA off requires a current code, so a hijacked session cannot do it silently. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return jsonError("Enter a current code to disable two-factor authentication.", 400);

  try {
    await verifySecondFactor(session.uid, body.code);
  } catch (error) {
    return jsonError(error instanceof MfaError ? error.message : "Unable to verify the code.", 401);
  }

  await disableMfa(session.uid);
  const response = NextResponse.json({ success: true });
  response.cookies.set({ name: ADMIN_MFA_COOKIE, value: "", ...adminCookieOptions, maxAge: 0 });
  return response;
}
