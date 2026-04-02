import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionCookie,
} from "@/lib/firebase/auth";

export async function requireAdminRequest(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionCookie(sessionCookie);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getValidationErrorMessage(error: ZodError) {
  return error.issues[0]?.message || "Invalid input.";
}
