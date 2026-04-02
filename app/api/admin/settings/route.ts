import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  getValidationErrorMessage,
  jsonError,
  requireAdminRequest,
} from "@/lib/firebase/http";
import { saveDashboardSettings } from "@/lib/firebase/portfolio";
import { dashboardSettingsSchema } from "@/lib/firebase/schemas";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json().catch(() => null);

  try {
    const input = dashboardSettingsSchema.parse(body);
    const settings = await saveDashboardSettings(input);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError("Unable to save the dashboard settings.", 500);
  }
}
