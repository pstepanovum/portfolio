import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { isMfaEnrolled, readMfaCookieValue } from "@/lib/auth/mfa";
import { adminAuth } from "@/lib/firebase/admin";

import {
  ADMIN_COOKIES_SECURE,
  ADMIN_MFA_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/cookie-names";

export { ADMIN_MFA_COOKIE, ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS };

export const adminCookieOptions = {
  httpOnly: true,
  secure: ADMIN_COOKIES_SECURE,
  sameSite: "lax" as const, // strict would drop the cookie on OAuth callbacks arriving from Google or a remote MCP server
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
};

export type AdminSession = DecodedIdToken & {
  /** The account has an authenticator enrolled. */
  mfaEnrolled: boolean;
  /** This browser has passed the second factor for this session. */
  mfaSatisfied: boolean;
};

/**
 * Core session check used by pages and API routes alike. A valid Firebase
 * session cookie with the admin claim is necessary but, once an authenticator
 * is enrolled, not sufficient: the second-factor cookie for the same uid must
 * be present too. An enrolled account without it is treated as signed out.
 */
export async function resolveAdminSession(
  sessionCookie: string | undefined,
  mfaCookie: string | undefined,
): Promise<AdminSession | null> {
  if (!sessionCookie) {
    return null;
  }

  let decoded: DecodedIdToken;

  try {
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }

  if (decoded.admin !== true) {
    return null;
  }

  const mfaEnrolled = await isMfaEnrolled(decoded.uid);
  const mfaSatisfied = mfaEnrolled && readMfaCookieValue(mfaCookie, decoded.uid);

  if (mfaEnrolled && !mfaSatisfied) {
    return null;
  }

  return { ...decoded, mfaEnrolled, mfaSatisfied };
}

/** For server components. */
export async function getAdminSession() {
  const cookieStore = await cookies();
  return resolveAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, cookieStore.get(ADMIN_MFA_COOKIE)?.value);
}

/** For route handlers. */
export function getAdminSessionFromRequest(request: { cookies: { get(name: string): { value: string } | undefined } }) {
  return resolveAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value, request.cookies.get(ADMIN_MFA_COOKIE)?.value);
}

/**
 * Pages: no session redirects to login; a session without an authenticator
 * is only allowed onto the security page until enrollment is complete.
 */
export async function requireAdminSession(options: { allowUnenrolled?: boolean } = {}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.mfaEnrolled && !options.allowUnenrolled) {
    redirect("/dashboard/security?enroll=1");
  }

  return session;
}
