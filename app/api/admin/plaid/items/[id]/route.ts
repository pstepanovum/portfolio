import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { deletePlaidItem, updatePlaidItemAlias } from "@/lib/connections/plaid-store";
import { getValidationErrorMessage, jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const patchSchema = z.object({ alias: z.string().trim().min(1).max(40) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    const { alias } = patchSchema.parse(await request.json().catch(() => null));
    const item = await updatePlaidItemAlias(id, alias);

    if (!item) {
      return jsonError("That bank is not linked.", 404);
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Unable to rename that bank.", 400);
  }
}

/** Withdraws consent at Plaid, then forgets the record. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deletePlaidItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to unlink that bank.", 400);
  }
}
