import "server-only";

import type { ManagedApp } from "@/lib/apps/registry";

/**
 * Friend codes live in each app's own Firestore; this calls the app's
 * `/api/admin/codes` with its owner secret. The secret never leaves the server.
 */

export type FriendCodeRedemption = {
  uid: string;
  email?: string;
  redeemedAt: number;
  grantExpiresAt: number | null;
  revokedAt?: number;
};

export type FriendCode = {
  id: string;
  code: string;
  label: string;
  durationDays: number | null;
  maxRedemptions: number;
  redemptions: number;
  expiresAt: number | null;
  disabled: boolean;
  createdAt: number;
  createdBy: string;
  redemptionList: FriendCodeRedemption[];
};

export type CreateFriendCodeInput = {
  label: string;
  code?: string;
  durationDays: number | null;
  maxRedemptions: number;
  expiresAt: number | null;
  createdBy?: string;
};

export class AppAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function isAppAdminConfigured(app: ManagedApp) {
  return (process.env[app.secretEnv]?.trim().length ?? 0) >= 24;
}

async function call<T>(app: ManagedApp, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  const secret = process.env[app.secretEnv]?.trim();
  if (!secret) {
    throw new AppAdminError(`${app.name} is not configured. Set ${app.secretEnv}.`, 503);
  }

  let response: Response;
  try {
    response = await fetch(`${app.baseUrl}/api/admin/codes`, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppAdminError(`Couldn't reach ${app.name}.`, 502);
  }

  const payload = (await response.json().catch(() => null)) as (T & { error_description?: string }) | null;
  if (!response.ok || !payload) {
    const status = response.status === 401 ? 502 : response.status >= 400 && response.status < 500 ? response.status : 502;
    const message =
      response.status === 401
        ? `${app.name} refused the admin secret. Check ${app.secretEnv}.`
        : payload?.error_description || `${app.name} answered ${response.status}.`;
    throw new AppAdminError(message, status);
  }
  return payload;
}

export async function listFriendCodes(app: ManagedApp) {
  return (await call<{ codes: FriendCode[] }>(app, "GET")).codes;
}

export async function createFriendCode(app: ManagedApp, input: CreateFriendCodeInput) {
  return (await call<{ code: FriendCode }>(app, "POST", input)).code;
}

export async function setFriendCodeDisabled(app: ManagedApp, codeId: string, disabled: boolean) {
  await call(app, "PATCH", { action: disabled ? "disable" : "enable", codeId });
}

export async function revokeFriendCodeRedemption(app: ManagedApp, codeId: string, uid: string) {
  return call<{ ok: true; result: string; grantDeleted: boolean }>(app, "PATCH", { action: "revoke", codeId, uid });
}
