import { NextResponse, type NextRequest } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { finishRegistration } from "@/lib/auth/passkeys";
import { clearChallengeCookie, currentChallengeBinding, getRelyingParty } from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** Completes registration; the challenge from register/options is spent here, pass or fail. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session?.mfaSatisfied) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { response?: RegistrationResponseJSON; name?: unknown } | null;
  if (!body?.response || typeof body.response !== "object") return jsonError("Missing passkey response.", 400);

  try {
    const passkey = await finishRegistration(
      session.uid,
      body.response,
      body.name,
      getRelyingParty(request),
      currentChallengeBinding(request),
    );
    const response = NextResponse.json({ success: true, passkey });
    clearChallengeCookie(response);
    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to register the passkey.", 400);
  }
}
