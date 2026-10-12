import { NextResponse, type NextRequest } from "next/server";
import { toDataURL } from "qrcode";
import { MfaAlreadyEnrolledError, getMfaState, startEnrollment } from "@/lib/auth/mfa";
import { secondFactorError, verifyFreshSecondFactor, type SecondFactorProof } from "@/lib/auth/step-up";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/**
 * Begins (or restarts) authenticator enrollment; returns the secret and a QR
 * to scan. The first factor on an account needs no proof, as before. Once a
 * passkey is enrolled, adding an authenticator app is a change to a protected
 * account and needs a fresh passkey or recovery code, like adding a passkey.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request, { allowUnenrolled: true });
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const state = await getMfaState(session.uid);

  if (state.totpEnrolled) {
    return jsonError(new MfaAlreadyEnrolledError().message, 409);
  }

  if (state.enrolled) {
    const body = (await request.json().catch(() => null)) as SecondFactorProof | null;

    try {
      await verifyFreshSecondFactor(request, session.uid, body);
    } catch (error) {
      return secondFactorError(error);
    }
  }

  try {
    const { secret, uri } = await startEnrollment(session.uid, session.email ?? "admin");
    const qrDataUrl = await toDataURL(uri, { margin: 1, width: 220 });

    return NextResponse.json({ secret, uri, qrDataUrl });
  } catch (error) {
    if (error instanceof MfaAlreadyEnrolledError) {
      return jsonError(error.message, 409);
    }

    throw error;
  }
}
