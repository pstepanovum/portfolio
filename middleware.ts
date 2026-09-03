import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_MFA_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/auth/cookie-names";

const ENROLL_PATH = "/dashboard/security";

/**
 * Enforces two-factor enrollment at the edge without touching the database:
 * an enrolled admin always carries the second-factor cookie (issued at sign-in
 * or enrollment), so a session cookie on its own means "signed in, not yet
 * enrolled" and is only allowed onto the security page to finish setup.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const hasMfa = Boolean(request.cookies.get(ADMIN_MFA_COOKIE)?.value);

  if (hasSession && !hasMfa && !pathname.startsWith(ENROLL_PATH)) {
    const url = request.nextUrl.clone();
    url.pathname = ENROLL_PATH;
    url.search = "?enroll=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/oauth/authorize"],
};
