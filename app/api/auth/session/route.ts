import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/firebase/auth";
import { jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { idToken?: string }
    | null;

  if (!body?.idToken) {
    return jsonError("Missing Firebase ID token.", 400);
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(body.idToken, true);

    if (decodedToken.admin !== true) {
      return jsonError("This account does not have admin access.", 403);
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!decodedToken.auth_time || nowInSeconds - decodedToken.auth_time > 300) {
      return jsonError("Please sign in again before opening the dashboard.", 401);
    }

    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return jsonError("Unable to create the admin session.", 401);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
