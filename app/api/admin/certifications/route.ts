import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import { createCertification } from "@/lib/firebase/portfolio";
import { certificationInputSchema } from "@/lib/firebase/schemas";
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
  const logoFile = getOptionalFormFile(formData, "logoFile");
  let uploadedLogo: { storagePath: string; url: string } | null = null;

  try {
    if (logoFile) {
      uploadedLogo = await uploadFileToStorage(logoFile, "certifications");
    }

    const input = certificationInputSchema.parse({
      title: getFormStringValue(formData, "title"),
      issuer: getFormStringValue(formData, "issuer"),
      date: getFormStringValue(formData, "date"),
      credentialId: getFormStringValue(formData, "credentialId"),
      skills: parseStringList(getFormStringValue(formData, "skills")),
      verificationUrl: getFormStringValue(formData, "verificationUrl"),
      logo: uploadedLogo?.url ?? getFormStringValue(formData, "logo"),
      logoStoragePath: uploadedLogo?.storagePath,
      order: getFormStringValue(formData, "order", "0"),
    });

    const certification = await createCertification(input);
    return NextResponse.json({ certification }, { status: 201 });
  } catch (error) {
    if (uploadedLogo) {
      await deleteStoredFile(uploadedLogo.storagePath);
    }

    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to create the certification.", 500);
  }
}
