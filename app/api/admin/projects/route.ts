import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  createProject,
} from "@/lib/firebase/portfolio";
import { projectInputSchema } from "@/lib/firebase/schemas";
import { deleteStoredFile, uploadFileToStorage } from "@/lib/firebase/storage";
import {
  getFormStringValue,
  getOptionalFormFile,
  parseStringList,
} from "@/lib/form-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const imageFile = getOptionalFormFile(formData, "imageFile");
  let uploadedImage: { storagePath: string; url: string } | null = null;

  try {
    if (imageFile) {
      uploadedImage = await uploadFileToStorage(imageFile, "projects");
    }

    const input = projectInputSchema.parse({
      title: getFormStringValue(formData, "title"),
      description: getFormStringValue(formData, "description"),
      tags: parseStringList(getFormStringValue(formData, "tags")),
      category: getFormStringValue(formData, "category"),
      github: getFormStringValue(formData, "github"),
      demo: getFormStringValue(formData, "demo"),
      image: uploadedImage?.url ?? getFormStringValue(formData, "image"),
      imageStoragePath: uploadedImage?.storagePath,
      order: getFormStringValue(formData, "order", "0"),
    });

    const project = await createProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (uploadedImage) {
      await deleteStoredFile(uploadedImage.storagePath);
    }

    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to create the project.", 500);
  }
}
