import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;

/**
 * Refresh tokens grant standing access to a whole mailbox, so they are never
 * stored as plaintext. The key lives only in the environment; Firestore holds
 * ciphertext that is useless without it.
 */
function getKey() {
  const raw = process.env.CONNECTIONS_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new Error(
      "CONNECTIONS_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      "CONNECTIONS_ENCRYPTION_KEY must decode to exactly 32 bytes (openssl rand -base64 32).",
    );
  }

  return key;
}

export function isEncryptionConfigured() {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string) {
  const [version, iv, tag, ciphertext] = payload.split(".");

  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Stored secret is not in a recognised format.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
