import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  deleteExperience,
  getExperienceById,
  updateExperience,
} from "@/lib/firebase/portfolio";
import { experienceInputSchema } from "@/lib/firebase/schemas";
import { parseStringList } from "@/lib/form-utils";

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
  const existingExperience = await getExperienceById(id);

  if (!existingExperience) {
    return jsonError("Timeline entry not found.", 404);
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  try {
    const input = experienceInputSchema.parse({
      date: body?.date ?? existingExperience.date,
      title: body?.title ?? existingExperience.title,
      company: body?.company ?? existingExperience.company,
      description: body?.description ?? existingExperience.description,
      location: body?.location ?? existingExperience.location ?? "",
      type: body?.type ?? existingExperience.type ?? "",
      achievements: parseStringList(
        String(
          body?.achievements ??
            (existingExperience.achievements ?? []).join("\n"),
        ),
      ),
      tech: parseStringList(
        String(body?.tech ?? (existingExperience.tech ?? []).join(", ")),
      ),
      order: body?.order ?? existingExperience.order,
    });

    const experience = await updateExperience(id, input);
    return NextResponse.json({ experience });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to update the timeline entry.", 500);
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
  const existingExperience = await getExperienceById(id);

  if (!existingExperience) {
    return jsonError("Timeline entry not found.", 404);
  }

  await deleteExperience(id);
  return NextResponse.json({ success: true });
}
