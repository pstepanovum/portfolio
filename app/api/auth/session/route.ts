import { NextResponse, type NextRequest } from "next/server";
import { MfaError, isMfaEnrolled, issueMfaCookieValue, verifySecondFactor } from "@/lib/auth/mfa";
import { adminAuth } from "@/lib/firebase/admin";
import {
  ADMIN_MFA_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminCookieOptions,
  getAdminSessionFromRequest,
} from "@/lib/firebase/auth";
import { jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

const FRESH_SIGN_IN_SECONDS = 300;

/**
 * Step one: a fresh Firebase ID token for an admin. If the account has an
 * authenticator, no cookies are issued until a valid code accompanies the
 * token; the client keeps the token and re-posts with the code.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { idToken?: string; mfaCode?: string } | null;

  if (!body?.idToken) {
    return jsonError("Missing Firebase ID token.", 400);
  }

  let decoded;

  try {
    decoded = await adminAuth.verifyIdToken(body.idToken, true);
  } catch {
    return jsonError("Unable to verify the sign-in.", 401);
  }

  if (decoded.admin !== true) {
    return jsonError("This account does not have admin access.", 403);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (!decoded.auth_time || nowInSeconds - decoded.auth_time > FRESH_SIGN_IN_SECONDS) {
    return jsonError("Please sign in again before opening the dashboard.", 401);
  }

  const enrolled = await isMfaEnrolled(decoded.uid);

  if (enrolled) {
    if (!body.mfaCode) {
      return NextResponse.json({ mfaRequired: true }, { status: 401 });
    }

    try {
      await verifySecondFactor(decoded.uid, body.mfaCode);
    } catch (error) {
      if (error instanceof MfaError) {
        return NextResponse.json({ error: error.message, mfaRequired: true, locked: error.code === "locked" }, { status: 401 });
      }

      throw error;
    }
  }

  try {
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ success: true, mfaEnrolled: enrolled });
    response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: sessionCookie, ...adminCookieOptions });

    if (enrolled) {
      response.cookies.set({
        name: ADMIN_MFA_COOKIE,
        value: issueMfaCookieValue(decoded.uid, ADMIN_SESSION_MAX_AGE_SECONDS),
        ...adminCookieOptions,
      });
    }

    return response;
  } catch {
    return jsonError("Unable to create the admin session.", 401);
  }
}

/** Sign out everywhere: clears both cookies and revokes every session for the account. */
export async function DELETE(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);

  if (session) {
    await adminAuth.revokeRefreshTokens(session.uid).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: "", ...adminCookieOptions, maxAge: 0 });
  response.cookies.set({ name: ADMIN_MFA_COOKIE, value: "", ...adminCookieOptions, maxAge: 0 });
  return response;
}
