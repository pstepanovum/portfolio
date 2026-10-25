import "server-only";

import { AppAdminError } from "@/lib/apps/codes-client";
import type { ManagedApp } from "@/lib/apps/registry";

/**
 * Support requests live in each app's own Firestore; this calls the app's
 * `/api/admin/support` with the same owner secret the friend codes use. A
 * reply is sent by the app, from its own support address, so the person
 * answers back into that app's inbox. The secret never leaves the server.
 */

export type SupportStatus = "open" | "answered" | "closed";

export const SUPPORT_STATUSES: readonly SupportStatus[] = ["open", "answered", "closed"];

export type SupportReply = { message: string; at: number; by: string };

export type SupportRequest = {
  id: string;
  email: string;
  name?: string;
  topic: string;
  message: string;
  platform?: string;
  uid?: string;
  userAgent?: string;
  status: SupportStatus;
  createdAt: number;
  updatedAt: number;
  answeredAt?: number;
  replies: SupportReply[];
};

async function call<T>(app: ManagedApp, method: "GET" | "POST" | "PATCH", options: { query?: string; body?: unknown } = {}): Promise<T> {
  if (!app.support) throw new AppAdminError(`${app.name} has no support inbox.`, 404);
  const secret = process.env[app.secretEnv]?.trim();
  if (!secret) throw new AppAdminError(`${app.name} is not configured. Set ${app.secretEnv}.`, 503);

  let response: Response;
  try {
    response = await fetch(`${app.baseUrl}/api/admin/support${options.query ?? ""}`, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppAdminError(`Couldn't reach ${app.name}.`, 502);
  }

  const payload = (await response.json().catch(() => null)) as (T & { message?: string; error_description?: string }) | null;
  if (!response.ok || !payload) {
    const status = response.status === 401 ? 502 : response.status >= 400 && response.status < 500 ? response.status : 502;
    const message =
      response.status === 401
        ? `${app.name} refused the admin secret. Check ${app.secretEnv}.`
        : payload?.error_description || payload?.message || `${app.name} answered ${response.status}.`;
    throw new AppAdminError(message, status);
  }
  return payload;
}

export async function listSupportRequests(app: ManagedApp, status?: SupportStatus) {
  return (await call<{ requests: SupportRequest[] }>(app, "GET", { query: status ? `?status=${status}` : "" })).requests;
}

export async function setSupportStatus(app: ManagedApp, id: string, status: SupportStatus) {
  return (await call<{ request: SupportRequest }>(app, "PATCH", { body: { id, status } })).request;
}

export async function replyToSupportRequest(app: ManagedApp, id: string, message: string, by: string) {
  return (await call<{ request: SupportRequest }>(app, "POST", { body: { id, message, by } })).request;
}
