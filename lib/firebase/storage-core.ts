import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { adminStorage } from "@/lib/firebase/admin-core";

function buildDownloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    storagePath,
  )}?alt=media&token=${token}`;
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sanitizeFilename(filename: string) {
  const extension = path.extname(filename);
  const basename = path
    .basename(filename, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    extension: extension.toLowerCase(),
    basename: basename || "upload",
  };
}

function getMimeType(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export async function uploadBufferToStorage(
  buffer: Buffer,
  {
    folder,
    filename,
    contentType,
    objectName,
  }: {
    folder: string;
    filename: string;
    contentType?: string;
    objectName?: string;
  },
) {
  const bucket = adminStorage.bucket();
  const token = randomUUID();
  const { basename, extension } = sanitizeFilename(filename);
  const normalizedObjectName = objectName
    ? `${sanitizeSlug(objectName) || "upload"}${extension}`
    : `${Date.now()}-${basename}${extension}`;
  const storagePath = `${folder}/${normalizedObjectName}`;

  await bucket.file(storagePath).save(buffer, {
    metadata: {
      contentType: contentType || getMimeType(filename),
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return {
    storagePath,
    url: buildDownloadUrl(bucket.name, storagePath, token),
  };
}

export async function uploadLocalPublicAssetToStorage(
  publicPath: string,
  folder: string,
  objectName: string,
) {
  const normalizedPath = publicPath.startsWith("/")
    ? publicPath.slice(1)
    : publicPath;
  const absolutePath = path.resolve(process.cwd(), "public", normalizedPath);
  const buffer = await fs.readFile(absolutePath);

  return uploadBufferToStorage(buffer, {
    folder,
    filename: path.basename(absolutePath),
    contentType: getMimeType(absolutePath),
    objectName,
  });
}

export async function deleteStoredFile(storagePath?: string) {
  if (!storagePath) {
    return;
  }

  await adminStorage.bucket().file(storagePath).delete({ ignoreNotFound: true });
}
