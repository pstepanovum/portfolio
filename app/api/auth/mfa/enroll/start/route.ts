import { NextResponse, type NextRequest } from "next/server";
import { toDataURL } from "qrcode";
import { startEnrollment } from "@/lib/auth/mfa";
import { getAdminSessionFromRequest } from "@/lib/firebase/auth";
import { jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";

/** Begins (or restarts) enrollment; returns the secret and a QR to scan. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request, { allowUnenrolled: true });
  if (unauthorized) return unauthorized;

  const session = await getAdminSessionFromRequest(request);
  if (!session) return jsonError("Unauthorized", 401);

  const { secret, uri } = await startEnrollment(session.uid, session.email ?? "admin");
  const qrDataUrl = await toDataURL(uri, { margin: 1, width: 220 });

  return NextResponse.json({ secret, uri, qrDataUrl });
}
