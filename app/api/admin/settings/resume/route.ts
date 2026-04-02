import { NextResponse, type NextRequest } from "next/server";
import {
  deleteStoredFile,
  uploadFileToStorage,
} from "@/lib/firebase/storage";
import {
  getDashboardSettings,
  saveDashboardSettings,
} from "@/lib/firebase/portfolio";
import {
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import {
  getFormStringValue,
  getOptionalFormFile,
} from "@/lib/form-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const resumeFile = getOptionalFormFile(formData, "resumeFile");
  const currentSettings = await getDashboardSettings();
  let uploadedResume: { storagePath: string; url: string } | null = null;

  try {
    if (!resumeFile) {
      return jsonError("Attach a resume file before uploading.", 400);
    }

    uploadedResume = await uploadFileToStorage(resumeFile, "resume");

    const settings = await saveDashboardSettings({
      ...currentSettings,
      resumeUrl: uploadedResume.url,
      resumeStoragePath: uploadedResume.storagePath,
    });

    if (
      currentSettings.resumeStoragePath &&
      currentSettings.resumeStoragePath !== uploadedResume.storagePath
    ) {
      await deleteStoredFile(currentSettings.resumeStoragePath);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    if (uploadedResume) {
      await deleteStoredFile(uploadedResume.storagePath);
    }

    return jsonError(
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to upload the resume.",
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const currentSettings = await getDashboardSettings();
  const resumeUrl = getFormStringValue(formData, "resumeUrl").trim();

  if (!resumeUrl) {
    return jsonError("Resume URL is required.", 400);
  }

  try {
    new URL(resumeUrl);
  } catch {
    return jsonError("Resume URL must be a valid absolute URL.", 400);
  }

  const settings = await saveDashboardSettings({
    ...currentSettings,
    resumeUrl,
    resumeStoragePath: "",
  });

  if (currentSettings.resumeStoragePath) {
    await deleteStoredFile(currentSettings.resumeStoragePath);
  }

  return NextResponse.json({ settings });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const currentSettings = await getDashboardSettings();

  if (currentSettings.resumeStoragePath) {
    await deleteStoredFile(currentSettings.resumeStoragePath);
  }

  const settings = await saveDashboardSettings({
    ...currentSettings,
    resumeUrl: "",
    resumeStoragePath: "",
  });

  return NextResponse.json({ settings });
}
