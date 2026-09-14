import { NextResponse, type NextRequest } from "next/server";
import { revokeFriendCodeRedemption } from "@/lib/apps/codes-client";
import { appAdminErrorResponse, CODE_ID_PATTERN, requireAppAdmin, UID_PATTERN } from "@/lib/apps/http";
import { jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

/**
 * Revokes one redemption. The app deletes the Plus grant only when this code
 * wrote it, and keeps the redemption marked revoked so it cannot be redeemed again.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ app: string; codeId: string; uid: string }> },
) {
  const { app, codeId, uid } = await context.params;
  const guard = await requireAppAdmin(request, app);
  if (guard instanceof NextResponse) return guard;
  if (!CODE_ID_PATTERN.test(codeId) || !UID_PATTERN.test(uid)) return jsonError("Unknown redemption.", 404);

  try {
    return NextResponse.json(await revokeFriendCodeRedemption(guard.app, codeId, uid));
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to revoke the redemption.");
  }
}
