import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createContactSubmission,
} from "@/lib/firebase/portfolio";
import {
  contactSubmissionSchema,
} from "@/lib/firebase/schemas";
import {
  getValidationErrorMessage,
  jsonError,
} from "@/lib/firebase/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const input = contactSubmissionSchema.parse(body);
    const contact = await createContactSubmission(input);

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to save your message right now.", 500);
  }
}
