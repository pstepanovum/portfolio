import { NextResponse, type NextRequest } from "next/server";
import { appAdminErrorResponse, requireAppAdmin } from "@/lib/apps/http";
import { SUPPORT_STATUSES, listSupportRequests, type SupportStatus } from "@/lib/apps/support-client";
import { jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** The app's support requests, newest first, optionally one status only. */
export async function GET(request: NextRequest, context: { params: Promise<{ app: string }> }) {
  const guard = await requireAppAdmin(request, (await context.params).app);
  if (guard instanceof NextResponse) return guard;
  if (!guard.app.support) return jsonError("This app has no support inbox.", 404);

  const status = request.nextUrl.searchParams.get("status");
  if (status && !SUPPORT_STATUSES.includes(status as SupportStatus)) return jsonError("Unknown status.", 400);

  try {
    return NextResponse.json({ requests: await listSupportRequests(guard.app, (status as SupportStatus | null) ?? undefined) });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to load support requests.");
  }
}
