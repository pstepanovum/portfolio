import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { AppAdminError } from "@/lib/apps/codes-client";
import { getManagedApp, type ManagedApp } from "@/lib/apps/registry";
import { getAdminSessionFromRequest, type AdminSession } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

/**
 * Guard for /api/admin/apps/[app]/*. Friend codes hand out Plus, so every
 * call, reads included, needs an admin session that has passed the enrolled
 * second factor, the same bar as connecting an account.
 */
export async function requireAppAdmin(
  request: NextRequest,
  appId: string,
): Promise<{ app: ManagedApp; session: AdminSession } | NextResponse> {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);
  if (!session.mfaEnrolled || !session.mfaSatisfied) {
    return jsonError("Confirm two-factor authentication before managing friend codes.", 403);
  }

  const app = getManagedApp(appId);
  if (!app) return jsonError("Unknown app.", 404);

  return { app, session };
}

export function appAdminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AppAdminError) return jsonError(error.message, error.status);
  console.error(fallback, error instanceof Error ? error.message : error);
  return jsonError(fallback, 500);
}

/** A friend code id: the SHA-256 hex the app uses as its document id. */
export const CODE_ID_PATTERN = /^[a-f0-9]{64}$/;
export const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
