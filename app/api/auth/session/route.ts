import { NextResponse, type NextRequest } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { MfaError, getMfaState, issueMfaCookieValue, verifySecondFactor } from "@/lib/auth/mfa";
import { verifyPasskeyAssertion } from "@/lib/auth/passkeys";
import { clearChallengeCookie, currentChallengeBinding, getRelyingParty } from "@/lib/auth/step-up";
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
 * Step one: a fresh Firebase ID token for an admin. If the account has a
 * second factor, no cookies are issued until the token comes back with a
 * passkey assertion (answering a `sign-in` challenge from
 * /api/auth/passkeys/options) or a TOTP or recovery code. Both paths end in
 * the same second-factor cookie below.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: string;
    mfaCode?: string;
    passkey?: AuthenticationResponseJSON;
  } | null;

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

  const mfa = await getMfaState(decoded.uid);
  const enrolled = mfa.enrolled;

  if (enrolled) {
    const factors = { mfaRequired: true, passkeyAvailable: mfa.passkeys.length > 0, totpAvailable: mfa.totpEnrolled };

    if (!body.mfaCode && !body.passkey) {
      return NextResponse.json(factors, { status: 401 });
    }

    try {
      if (body.passkey && typeof body.passkey === "object") {
        await verifyPasskeyAssertion(decoded.uid, body.passkey, getRelyingParty(request), "sign-in", currentChallengeBinding(request));
      } else {
        await verifySecondFactor(decoded.uid, String(body.mfaCode));
      }
    } catch (error) {
      if (error instanceof MfaError) {
        return NextResponse.json({ ...factors, error: error.message, locked: error.code === "locked" }, { status: 401 });
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
      clearChallengeCookie(response);
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
