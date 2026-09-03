import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { revokeGoogleToken } from "@/lib/connections/google";
import {
  deleteConnection,
  updateConnectionAlias,
  updateConnectionPermissions,
} from "@/lib/connections/store";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    alias: z.string().trim().min(1).max(40).optional(),
    permissions: z.object({ write: z.boolean().optional(), destructive: z.boolean().optional() }).optional(),
  })
  .refine((v) => v.alias !== undefined || v.permissions !== undefined, { message: "Nothing to update." });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const input = patchSchema.parse(await request.json().catch(() => null));
    let connection = input.alias !== undefined ? await updateConnectionAlias(id, input.alias) : null;

    if (input.permissions) {
      connection = await updateConnectionPermissions(id, input.permissions);
    }

    if (!connection) {
      return jsonError("Connection not found.", 404);
    }

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to rename the connection.",
      400,
    );
  }
}

/** Removes our record and asks Google to revoke the grant, in that order. */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const refreshToken = await deleteConnection(id);

  if (refreshToken === null) {
    return jsonError("Connection not found.", 404);
  }

  await revokeGoogleToken(refreshToken);

  return NextResponse.json({ success: true });
}
