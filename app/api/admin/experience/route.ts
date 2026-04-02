import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import { createExperience } from "@/lib/firebase/portfolio";
import { experienceInputSchema } from "@/lib/firebase/schemas";
import { parseStringList } from "@/lib/form-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  try {
    const input = experienceInputSchema.parse({
      ...body,
      achievements: parseStringList(String(body?.achievements ?? "")),
      tech: parseStringList(String(body?.tech ?? "")),
    });

    const experience = await createExperience(input);
    return NextResponse.json({ experience }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to create the timeline entry.", 500);
  }
}
