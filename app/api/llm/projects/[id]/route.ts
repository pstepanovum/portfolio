import { NextResponse, type NextRequest } from "next/server";
import { getProjectById } from "@/lib/firebase/portfolio";
import { jsonError } from "@/lib/firebase/http";
import { requireLlmApiAuth } from "@/lib/llm-api";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireLlmApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const project = await getProjectById(id);

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  return NextResponse.json({ project });
}
