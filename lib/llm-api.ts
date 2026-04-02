import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDashboardSettings } from "@/lib/firebase/portfolio";

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function requireLlmApiAuth(request: NextRequest) {
  const settings = await getDashboardSettings();
  const providedPublicKey =
    request.headers.get("x-portfolio-public-key") ||
    request.headers.get("x-public-key") ||
    "";
  const providedSecretKey =
    request.headers.get("x-portfolio-secret-key") ||
    getBearerToken(request.headers.get("authorization")) ||
    "";

  if (!settings.llmPublicKey || !settings.llmSecretKey) {
    return NextResponse.json(
      { error: "LLM API keys are not configured." },
      { status: 503 },
    );
  }

  if (
    !safeEqual(providedPublicKey, settings.llmPublicKey) ||
    !safeEqual(providedSecretKey, settings.llmSecretKey)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
