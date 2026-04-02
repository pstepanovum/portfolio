import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDashboardSettings } from "@/lib/firebase/portfolio";
import { jsonError } from "@/lib/firebase/http";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export const runtime = "nodejs";

export async function GET() {
  const settings = await getDashboardSettings();

  return NextResponse.json({
    available: Boolean(settings.resumeUrl),
    isPublic: settings.resumeIsPublic,
    requiresPassword: Boolean(settings.resumeUrl && !settings.resumeIsPublic),
  });
}

export async function POST(request: Request) {
  const settings = await getDashboardSettings();
  const body = (await request.json().catch(() => null)) as
    | { password?: string }
    | null;

  if (!settings.resumeUrl) {
    return jsonError("Resume is not available right now.", 404);
  }

  if (!settings.resumeIsPublic) {
    const providedPassword = body?.password?.trim() || "";

    if (!settings.resumePassword) {
      return jsonError("Resume access is private and no password is configured.", 403);
    }

    if (!safeEqual(providedPassword, settings.resumePassword)) {
      return jsonError("Incorrect password.", 401);
    }
  }

  return NextResponse.json({ url: settings.resumeUrl });
}
