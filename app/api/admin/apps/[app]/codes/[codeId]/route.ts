import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { setFriendCodeDisabled } from "@/lib/apps/codes-client";
import { appAdminErrorResponse, CODE_ID_PATTERN, requireAppAdmin } from "@/lib/apps/http";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

const patchSchema = z.object({ disabled: z.boolean() });

/** Disables a code (grants already given are kept) or turns it back on. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ app: string; codeId: string }> }) {
  const { app, codeId } = await context.params;
  const guard = await requireAppAdmin(request, app);
  if (guard instanceof NextResponse) return guard;
  if (!CODE_ID_PATTERN.test(codeId)) return jsonError("Unknown code.", 404);

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof ZodError) return jsonError(getValidationErrorMessage(error), 400);
    throw error;
  }

  try {
    await setFriendCodeDisabled(guard.app, codeId, input.disabled);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to update the code.");
  }
}
