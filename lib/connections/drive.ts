import "server-only";

import { GoogleApiError, googleFetch, qs } from "@/lib/connections/google-api";

const BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FIELDS = "id,name,mimeType,size,modifiedTime,webViewLink,parents,owners(emailAddress),shared,trashed";
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
type Json = Record<string, unknown>;

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
  parents: string[];
  owner?: string;
  shared: boolean;
  trashed: boolean;
  isFolder: boolean;
};

const EXPORT_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

function toFile(raw: Json): DriveFile {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    mimeType: String(raw.mimeType ?? ""),
    size: raw.size !== undefined ? Number(raw.size) : undefined,
    modifiedTime: typeof raw.modifiedTime === "string" ? raw.modifiedTime : undefined,
    webViewLink: typeof raw.webViewLink === "string" ? raw.webViewLink : undefined,
    parents: Array.isArray(raw.parents) ? raw.parents.map(String) : [],
    owner: Array.isArray(raw.owners) ? String((raw.owners[0] as Json)?.emailAddress ?? "") : undefined,
    shared: Boolean(raw.shared),
    trashed: Boolean(raw.trashed),
    isFolder: raw.mimeType === "application/vnd.google-apps.folder",
  };
}

const DRIVE_QUERY_SYNTAX = /\b(contains|in|has|=|!=|<|<=|>|>=)\b|\b(name|fullText|mimeType|modifiedTime|createdTime|starred|trashed|parents|owners|sharedWithMe|visibility|properties|appProperties)\b|[=<>]/;

/** Drive's q syntax escapes ' and \ with a backslash. */
function escapeDriveValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Accepts either Drive's own q syntax or a plain phrase. A model reaching for
 * "invoice" gets a name-or-content search instead of Drive's opaque
 * "Invalid Value"; explicit syntax passes through untouched.
 */
export function toDriveQuery(query: string | undefined) {
  const trimmed = query?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (DRIVE_QUERY_SYNTAX.test(trimmed)) {
    return trimmed;
  }

  const escaped = escapeDriveValue(trimmed);
  return `(name contains '${escaped}' or fullText contains '${escaped}')`;
}

export async function searchFiles(
  token: string,
  input: { query?: string; folderId?: string; pageSize?: number; pageToken?: string; orderBy?: string; includeTrashed?: boolean },
) {
  const q = toDriveQuery(input.query);
  const clauses = [
    q,
    input.folderId ? `'${escapeDriveValue(input.folderId)}' in parents` : undefined,
    input.includeTrashed ? undefined : "trashed = false",
  ].filter(Boolean);

  const sentQuery = clauses.join(" and ");
  let data: { files?: Json[]; nextPageToken?: string };

  try {
    data = await googleFetch<{ files?: Json[]; nextPageToken?: string }>(
      token,
      `${BASE}/files${qs({
        q: sentQuery,
        pageSize: Math.min(input.pageSize ?? 25, 100),
        pageToken: input.pageToken,
        orderBy: input.orderBy ?? "modifiedTime desc",
        fields: `nextPageToken,files(${FIELDS})`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })}`,
    );
  } catch (error) {
    // Drive's "Invalid Value" says nothing about what was wrong; echo the query
    // so the caller can see and fix it.
    if (error instanceof GoogleApiError && /invalid value/i.test(error.message)) {
      throw new GoogleApiError(
        `Drive rejected the search (${error.message}). Query sent: ${sentQuery}. Use Drive syntax such as name contains 'x', fullText contains 'x', mimeType = 'application/pdf', or a plain phrase; escape apostrophes as \\'.`,
        error.status,
      );
    }

    throw error;
  }

  return { files: (data.files ?? []).map(toFile), nextPageToken: data.nextPageToken, query: sentQuery };
}

export async function getFile(token: string, fileId: string) {
  return toFile(await googleFetch<Json>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ fields: FIELDS, supportsAllDrives: true })}`));
}

/** Google-native files are exported as text/CSV; others come back base64 (capped). */
export async function downloadFile(token: string, fileId: string) {
  const file = await getFile(token, fileId);
  const exportType = EXPORT_TYPES[file.mimeType];

  if (exportType) {
    const buffer = await googleFetch<ArrayBuffer>(token, `${BASE}/files/${encodeURIComponent(fileId)}/export${qs({ mimeType: exportType })}`, { raw: true });
    return { file, mimeType: exportType, text: Buffer.from(buffer).toString("utf8") };
  }

  if ((file.size ?? 0) > MAX_DOWNLOAD_BYTES) {
    throw new Error(`File is ${file.size} bytes; the download limit is ${MAX_DOWNLOAD_BYTES}.`);
  }

  const buffer = Buffer.from(await googleFetch<ArrayBuffer>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ alt: "media", supportsAllDrives: true })}`, { raw: true }));
  const isText = /^text\/|json|xml|csv/.test(file.mimeType);

  return isText
    ? { file, mimeType: file.mimeType, text: buffer.toString("utf8") }
    : { file, mimeType: file.mimeType, base64: buffer.toString("base64") };
}

export async function createFolder(token: string, name: string, parentId?: string) {
  return toFile(await googleFetch<Json>(token, `${BASE}/files${qs({ fields: FIELDS, supportsAllDrives: true })}`, {
    method: "POST",
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  }));
}

/** Multipart upload of a text body; converts to a Google Doc/Sheet when asked. */
export async function uploadTextFile(
  token: string,
  input: { name: string; content: string; mimeType?: string; parentId?: string; convertTo?: "document" | "spreadsheet" },
) {
  const boundary = `boundary_${Date.now()}`;
  const metadata = {
    name: input.name,
    ...(input.parentId ? { parents: [input.parentId] } : {}),
    ...(input.convertTo ? { mimeType: `application/vnd.google-apps.${input.convertTo}` } : {}),
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${input.mimeType ?? "text/plain"}; charset=UTF-8`,
    "",
    input.content,
    `--${boundary}--`,
  ].join("\r\n");

  return toFile(await googleFetch<Json>(token, `${UPLOAD}/files${qs({ uploadType: "multipart", fields: FIELDS, supportsAllDrives: true })}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  }));
}

export async function renameFile(token: string, fileId: string, name: string) {
  return toFile(await googleFetch<Json>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ fields: FIELDS, supportsAllDrives: true })}`, { method: "PATCH", body: JSON.stringify({ name }) }));
}

export async function moveFile(token: string, fileId: string, newParentId: string) {
  const current = await getFile(token, fileId);
  return toFile(await googleFetch<Json>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ addParents: newParentId, removeParents: current.parents.join(","), fields: FIELDS, supportsAllDrives: true })}`, { method: "PATCH", body: JSON.stringify({}) }));
}

export async function setTrashed(token: string, fileId: string, trashed: boolean) {
  return toFile(await googleFetch<Json>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ fields: FIELDS, supportsAllDrives: true })}`, { method: "PATCH", body: JSON.stringify({ trashed }) }));
}

export async function deleteFilePermanently(token: string, fileId: string) {
  await googleFetch<void>(token, `${BASE}/files/${encodeURIComponent(fileId)}${qs({ supportsAllDrives: true })}`, { method: "DELETE" });
}

export async function shareFile(
  token: string,
  input: { fileId: string; email?: string; role: "reader" | "commenter" | "writer"; type: "user" | "anyone"; notify?: boolean },
) {
  return googleFetch<Json>(token, `${BASE}/files/${encodeURIComponent(input.fileId)}/permissions${qs({ sendNotificationEmail: Boolean(input.notify), supportsAllDrives: true })}`, {
    method: "POST",
    body: JSON.stringify({ role: input.role, type: input.type, ...(input.email ? { emailAddress: input.email } : {}) }),
  });
}
