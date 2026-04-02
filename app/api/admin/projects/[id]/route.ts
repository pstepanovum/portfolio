import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/firebase/portfolio";
import { projectInputSchema } from "@/lib/firebase/schemas";
import { deleteStoredFile, uploadFileToStorage } from "@/lib/firebase/storage";
import {
  getFormStringValue,
  getOptionalFormFile,
  parseStringList,
} from "@/lib/form-utils";

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
  const existingProject = await getProjectById(id);

  if (!existingProject) {
    return jsonError("Project not found.", 404);
  }

  const formData = await request.formData();
  const imageFile = getOptionalFormFile(formData, "imageFile");
  let uploadedImage: { storagePath: string; url: string } | null = null;

  try {
    if (imageFile) {
      uploadedImage = await uploadFileToStorage(imageFile, "projects");
    }

    const input = projectInputSchema.parse({
      title: getFormStringValue(formData, "title", existingProject.title),
      description: getFormStringValue(
        formData,
        "description",
        existingProject.description,
      ),
      tags: parseStringList(
        getFormStringValue(formData, "tags", existingProject.tags.join(", ")),
      ),
      category: getFormStringValue(formData, "category", existingProject.category),
      github: getFormStringValue(formData, "github", existingProject.github ?? ""),
      demo: getFormStringValue(formData, "demo", existingProject.demo ?? ""),
      image: uploadedImage?.url ?? getFormStringValue(formData, "image", existingProject.image),
      imageStoragePath:
        uploadedImage?.storagePath ?? existingProject.imageStoragePath,
      order: getFormStringValue(formData, "order", String(existingProject.order)),
    });

    const project = await updateProject(id, input);

    if (uploadedImage && existingProject.imageStoragePath) {
      await deleteStoredFile(existingProject.imageStoragePath);
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to update project", { id, error });

    if (uploadedImage) {
      await deleteStoredFile(uploadedImage.storagePath);
    }

    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to update the project.",
      500,
    );
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
  const existingProject = await getProjectById(id);

  if (!existingProject) {
    return jsonError("Project not found.", 404);
  }

  await deleteProject(id);

  if (existingProject.imageStoragePath) {
    await deleteStoredFile(existingProject.imageStoragePath);
  }

  return NextResponse.json({ success: true });
}
