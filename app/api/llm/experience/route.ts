import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { createExperience } from "@/lib/firebase/portfolio";
import { experienceInputSchema } from "@/lib/firebase/schemas";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";
import { requireLlmApiAuth } from "@/lib/llm-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = await requireLlmApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json().catch(() => null);

  try {
    const input = experienceInputSchema.parse(body);
    const experience = await createExperience(input);
    return NextResponse.json({ experience }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to create the timeline entry.", 500);
  }
}
