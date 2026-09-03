import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";

/**
 * API guard. Beyond a valid admin session (which already implies the second
 * factor once enrolled), every admin API is closed until an authenticator is
 * enrolled, so a password alone can never drive the dashboard's APIs. The
 * enrollment endpoints opt out via allowUnenrolled.
 */
export async function requireAdminRequest(
  request: NextRequest,
  options: { allowUnenrolled?: boolean } = {},
) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.mfaEnrolled && !options.allowUnenrolled) {
    return NextResponse.json(
      { error: "Two-factor authentication must be set up before using the dashboard.", code: "mfa_enrollment_required" },
      { status: 403 },
    );
  }

  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getValidationErrorMessage(error: ZodError) {
  return error.issues[0]?.message || "Invalid input.";
}
