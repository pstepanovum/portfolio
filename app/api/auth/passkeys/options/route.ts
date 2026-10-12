import { NextResponse, type NextRequest } from "next/server";
import { createAuthenticationOptions } from "@/lib/auth/passkeys";
import { getRelyingParty, newChallengeBinding, secondFactorError, setChallengeCookie } from "@/lib/auth/step-up";
import { adminAuth } from "@/lib/firebase/admin";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

const FRESH_SIGN_IN_SECONDS = 300;

/**
 * Options for a passkey assertion.
 *
 * `sign-in`: the second step after the password, so there is no session yet;
 * the fresh Firebase ID token names the account, checked exactly as
 * /api/auth/session checks it. `step-up`: a signed-in admin confirming a
 * sensitive change. Either way the challenge is stored server-side, bound to
 * a nonce cookie set here, and expires in five minutes.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { purpose?: string; idToken?: string } | null;
  let uid: string;
  let purpose: "sign-in" | "step-up";

  if (body?.purpose === "sign-in") {
    if (!body.idToken) return jsonError("Missing Firebase ID token.", 400);

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(body.idToken, true);
    } catch {
      return jsonError("Unable to verify the sign-in.", 401);
    }

    if (decoded.admin !== true) return jsonError("This account does not have admin access.", 403);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!decoded.auth_time || nowInSeconds - decoded.auth_time > FRESH_SIGN_IN_SECONDS) {
      return jsonError("Please sign in again before opening the dashboard.", 401);
    }

    uid = decoded.uid;
    purpose = "sign-in";
  } else if (body?.purpose === "step-up") {
    const unauthorized = await requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const session = await getAdminSessionFromRequest(request);
    if (!session?.mfaSatisfied) return jsonError("Unauthorized", 401);

    uid = session.uid;
    purpose = "step-up";
  } else {
    return jsonError("Unknown passkey request.", 400);
  }

  const { nonce, binding } = newChallengeBinding(request);

  try {
    const options = await createAuthenticationOptions(uid, getRelyingParty(request), purpose, binding);
    const response = NextResponse.json({ options });
    setChallengeCookie(response, nonce);
    return response;
  } catch (error) {
    return secondFactorError(error);
  }
}
