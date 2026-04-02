import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import { geminiDraftRequestSchema } from "@/lib/firebase/schemas";
import { generateProjectDraft } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json().catch(() => null);

  try {
    const input = geminiDraftRequestSchema.parse(body);
    const draft = await generateProjectDraft(input.notes);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(
      error instanceof Error ? error.message : "Unable to generate the project draft.",
      500,
    );
  }
}
