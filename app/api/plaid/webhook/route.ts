import { NextResponse } from "next/server";
import { verifyPlaidWebhook } from "@/lib/connections/plaid-webhook";
import { markItemByPlaidId } from "@/lib/connections/plaid-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PlaidWebhook = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string; error_message?: string } | null;
  consent_expiration_time?: string;
};

/**
 * Item notifications from Plaid.
 *
 * Only status matters here. This dashboard stores no transaction history, so
 * there is nothing to keep in sync; what it needs to know is when a bank has
 * stopped trusting the connection, which is the difference between a tool
 * saying "reconnect on the dashboard" and a tool failing mysteriously.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = await verifyPlaidWebhook(rawBody, request.headers.get("plaid-verification"));

  if (!verification.ok) {
    // Deliberately terse: an unverified caller learns nothing about why.
    console.warn("Rejected a Plaid webhook:", verification.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PlaidWebhook;

  try {
    payload = JSON.parse(rawBody) as PlaidWebhook;
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const itemId = payload.item_id;

  if (!itemId || payload.webhook_type !== "ITEM") {
    // Transaction and other webhooks are acknowledged and ignored.
    return NextResponse.json({ ok: true });
  }

  switch (payload.webhook_code) {
    case "ERROR": {
      const code = payload.error?.error_code;

      if (code === "ITEM_LOGIN_REQUIRED") {
        await markItemByPlaidId(itemId, "reauth", "The bank asked for a fresh sign-in.");
      } else if (code) {
        await markItemByPlaidId(itemId, "error", payload.error?.error_message ?? code);
      }

      break;
    }

    case "PENDING_EXPIRATION":
    case "PENDING_DISCONNECT":
      await markItemByPlaidId(
        itemId,
        "reauth",
        payload.consent_expiration_time
          ? `Consent expires ${new Date(payload.consent_expiration_time).toLocaleDateString()}. Sign in again to keep this bank connected.`
          : "Consent is expiring. Sign in again to keep this bank connected.",
      );
      break;

    case "USER_PERMISSION_REVOKED":
    case "USER_ACCOUNT_REVOKED":
      await markItemByPlaidId(itemId, "error", "Access was revoked at the bank.");
      break;

    case "LOGIN_REPAIRED":
      await markItemByPlaidId(itemId, "active");
      break;

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
