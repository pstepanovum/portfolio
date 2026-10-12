import "server-only";

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { ADMIN_COOKIES_SECURE, ADMIN_SESSION_COOKIE, ADMIN_WEBAUTHN_COOKIE } from "@/lib/auth/cookie-names";
import { LastFactorError, MfaError, verifySecondFactor } from "@/lib/auth/mfa";
import { CHALLENGE_TTL_MS, challengeBinding, resolveRelyingParty } from "@/lib/auth/passkey-policy";
import { verifyPasskeyAssertion } from "@/lib/auth/passkeys";
import { siteConfig } from "@/lib/seo";

/** RP ID and origin for this deployment; the Host header only counts for localhost in development. */
export function getRelyingParty(request: NextRequest) {
  return resolveRelyingParty({
    nodeEnv: process.env.NODE_ENV,
    configuredIssuer: process.env.OAUTH_ISSUER,
    siteUrl: siteConfig.url,
    host: request.headers.get("host"),
  });
}

/**
 * Starts a ceremony: a new random nonce goes into an httpOnly cookie and the
 * binding derived from it (plus the session cookie, when there is one) is
 * stored next to the challenge. The browser never chooses either value.
 */
export function newChallengeBinding(request: NextRequest) {
  const nonce = randomBytes(24).toString("base64url");
  return { nonce, binding: challengeBinding(nonce, request.cookies.get(ADMIN_SESSION_COOKIE)?.value) };
}

export function setChallengeCookie(response: NextResponse, nonce: string) {
  response.cookies.set({
    name: ADMIN_WEBAUTHN_COOKIE,
    value: nonce,
    httpOnly: true,
    secure: ADMIN_COOKIES_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
  });
}

export function clearChallengeCookie(response: NextResponse) {
  response.cookies.set({ name: ADMIN_WEBAUTHN_COOKIE, value: "", httpOnly: true, secure: ADMIN_COOKIES_SECURE, sameSite: "strict", path: "/", maxAge: 0 });
}

/** The binding the presented assertion must match; unusable without the nonce cookie. */
export function currentChallengeBinding(request: NextRequest) {
  const nonce = request.cookies.get(ADMIN_WEBAUTHN_COOKIE)?.value;
  return nonce ? challengeBinding(nonce, request.cookies.get(ADMIN_SESSION_COOKIE)?.value) : `missing:${randomBytes(8).toString("hex")}`;
}

export type SecondFactorProof = { code?: unknown; passkey?: unknown };

/**
 * A second factor proven in this very request: a passkey assertion answering
 * a step-up challenge, or a current TOTP or recovery code. Sensitive security
 * changes (adding or removing a passkey, turning off the authenticator app,
 * new recovery codes, enrolling an app while a passkey exists) call this, so
 * stolen session cookies alone can change none of them.
 */
export async function verifyFreshSecondFactor(request: NextRequest, uid: string, proof: SecondFactorProof | null) {
  if (proof?.passkey && typeof proof.passkey === "object") {
    return verifyPasskeyAssertion(
      uid,
      proof.passkey as AuthenticationResponseJSON,
      getRelyingParty(request),
      "step-up",
      currentChallengeBinding(request),
    );
  }

  if (typeof proof?.code === "string" && proof.code.trim()) {
    return verifySecondFactor(uid, proof.code.trim());
  }

  throw new MfaError("Confirm with a passkey or a current code first.", "required");
}

/** JSON error for a failed proof; anything that is not a second-factor error is rethrown. */
export function secondFactorError(error: unknown) {
  if (error instanceof MfaError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "required" ? 400 : 401 });
  }

  if (error instanceof LastFactorError) {
    return NextResponse.json({ error: error.message, code: "last_factor" }, { status: 409 });
  }

  throw error;
}
