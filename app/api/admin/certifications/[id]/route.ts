import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  deleteCertification,
  getCertificationById,
  updateCertification,
} from "@/lib/firebase/portfolio";
import { certificationInputSchema } from "@/lib/firebase/schemas";
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
  const existingCertification = await getCertificationById(id);

  if (!existingCertification) {
    return jsonError("Certification not found.", 404);
  }

  const formData = await request.formData();
  const logoFile = getOptionalFormFile(formData, "logoFile");
  let uploadedLogo: { storagePath: string; url: string } | null = null;

  try {
    if (logoFile) {
      uploadedLogo = await uploadFileToStorage(logoFile, "certifications");
    }

    const input = certificationInputSchema.parse({
      title: getFormStringValue(formData, "title", existingCertification.title),
      issuer: getFormStringValue(formData, "issuer", existingCertification.issuer),
      date: getFormStringValue(formData, "date", existingCertification.date),
      credentialId: getFormStringValue(
        formData,
        "credentialId",
        existingCertification.credentialId ?? "",
      ),
      skills: parseStringList(
        getFormStringValue(
          formData,
          "skills",
          (existingCertification.skills ?? []).join(", "),
        ),
      ),
      verificationUrl: getFormStringValue(
        formData,
        "verificationUrl",
        existingCertification.verificationUrl ?? "",
      ),
      logo: uploadedLogo?.url ?? getFormStringValue(formData, "logo", existingCertification.logo ?? ""),
      logoStoragePath:
        uploadedLogo?.storagePath ?? existingCertification.logoStoragePath,
      order: getFormStringValue(
        formData,
        "order",
        String(existingCertification.order),
      ),
    });

    const certification = await updateCertification(id, input);

    if (uploadedLogo && existingCertification.logoStoragePath) {
      await deleteStoredFile(existingCertification.logoStoragePath);
    }

    return NextResponse.json({ certification });
  } catch (error) {
    if (uploadedLogo) {
      await deleteStoredFile(uploadedLogo.storagePath);
    }

    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to update the certification.", 500);
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
  const existingCertification = await getCertificationById(id);

  if (!existingCertification) {
    return jsonError("Certification not found.", 404);
  }

  await deleteCertification(id);

  if (existingCertification.logoStoragePath) {
    await deleteStoredFile(existingCertification.logoStoragePath);
  }

  return NextResponse.json({ success: true });
}
