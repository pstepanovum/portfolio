import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  deleteContact,
  updateContactStatus,
} from "@/lib/firebase/portfolio";
import { contactStatusSchema } from "@/lib/firebase/schemas";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  try {
    const input = contactStatusSchema.parse(body);
    const contact = await updateContactStatus(id, input.status);
    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to update the contact.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    await deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to delete the contact.",
      500,
    );
  }
}
