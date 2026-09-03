import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/** RFC 4648 base32 without padding, the form authenticator apps expect. */
export function base32Encode(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

/** RFC 6238 with HMAC-SHA1, 30-second steps, 6 digits. */
export function totpCodeAt(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / TOTP_STEP_SECONDS);
}

/**
 * Accepts the current step and one either side for clock drift. Returns the
 * matching step so the caller can refuse a code that was already used.
 */
export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const candidate = code.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(candidate)) {
    return null;
  }

  const step = currentStep(now);

  for (const delta of [0, -1, 1]) {
    const expected = totpCodeAt(secret, step + delta);

    if (timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))) {
      return step + delta;
    }
  }

  return null;
}

export function otpauthUri(secret: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
  return `otpauth://totp/${label}?${params}`;
}
