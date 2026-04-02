import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { createProject, getProjects } from "@/lib/firebase/portfolio";
import { projectInputSchema } from "@/lib/firebase/schemas";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";
import { requireLlmApiAuth } from "@/lib/llm-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = await requireLlmApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireLlmApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json().catch(() => null);

  try {
    const input = projectInputSchema.parse(body);
    const project = await createProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to create the project.", 500);
  }
}
