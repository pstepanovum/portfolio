import "server-only";

import { createHash, createPublicKey, timingSafeEqual, verify as verifySignature } from "node:crypto";
import { plaidFetch } from "@/lib/connections/plaid";

/** Plaid signs with ES256 and rotates keys; anything else is rejected outright. */
const REQUIRED_ALGORITHM = "ES256";
const MAX_AGE_SECONDS = 5 * 60;

type VerificationKey = {
  key: { alg: string; crv: string; kid: string; kty: string; use: string; x: string; y: string };
};

type JwtHeader = { alg?: string; kid?: string };
type JwtPayload = { iat?: number; request_body_sha256?: string };

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

/**
 * Converts Plaid's JOSE signature to the DER-ish form Node expects.
 *
 * Node's `verify` accepts the raw r||s pair when told the signature is in
 * IEEE-P1363 format, which is what JWS uses, so no manual re-encoding is
 * needed beyond the base64url decode.
 */
function toSignatureBuffer(segment: string) {
  return Buffer.from(segment, "base64url");
}

const keyCache = new Map<string, VerificationKey["key"]>();

async function getVerificationKey(keyId: string) {
  const cached = keyCache.get(keyId);

  if (cached) {
    return cached;
  }

  const { key } = await plaidFetch<VerificationKey>("/webhook_verification_key/get", {
    key_id: keyId,
  });

  keyCache.set(keyId, key);
  return key;
}

/**
 * Verifies that a webhook really came from Plaid.
 *
 * The endpoint has to be publicly reachable, so the body alone proves nothing.
 * Plaid sends a JWT whose payload carries a SHA-256 of the exact request body;
 * checking the signature and then that digest is what makes a forged item
 * status update impossible.
 */
export async function verifyPlaidWebhook(rawBody: string, verificationHeader: string | null) {
  if (!verificationHeader) {
    return { ok: false as const, reason: "Missing Plaid-Verification header." };
  }

  const [headerSegment, payloadSegment, signatureSegment] = verificationHeader.split(".");

  if (!headerSegment || !payloadSegment || !signatureSegment) {
    return { ok: false as const, reason: "Malformed verification token." };
  }

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = decodeSegment<JwtHeader>(headerSegment);
    payload = decodeSegment<JwtPayload>(payloadSegment);
  } catch {
    return { ok: false as const, reason: "Unreadable verification token." };
  }

  if (header.alg !== REQUIRED_ALGORITHM) {
    return { ok: false as const, reason: `Unexpected signing algorithm ${header.alg ?? "none"}.` };
  }

  if (!header.kid) {
    return { ok: false as const, reason: "Verification token names no key." };
  }

  let publicKey;

  try {
    const jwk = await getVerificationKey(header.kid);
    publicKey = createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    return { ok: false as const, reason: "Signing key could not be fetched." };
  }

  const signed = Buffer.from(`${headerSegment}.${payloadSegment}`, "utf8");
  const signatureValid = verifySignature(
    "sha256",
    signed,
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    toSignatureBuffer(signatureSegment),
  );

  if (!signatureValid) {
    return { ok: false as const, reason: "Signature did not verify." };
  }

  // A valid signature on a replayed old body is still a replay.
  const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;

  if (Math.abs(Date.now() / 1000 - issuedAt) > MAX_AGE_SECONDS) {
    return { ok: false as const, reason: "Verification token is outside its freshness window." };
  }

  const expected = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const provided = payload.request_body_sha256 ?? "";

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    return { ok: false as const, reason: "Body digest did not match the signed value." };
  }

  return { ok: true as const };
}
