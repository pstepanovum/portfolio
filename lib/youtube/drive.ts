import "server-only";

import {
  createFolder,
  escapeDriveValue,
  searchFiles,
  uploadTextFile,
} from "@/lib/connections/drive";
import { GoogleAuthError } from "@/lib/connections/google";
import { GoogleApiError } from "@/lib/connections/google-api";
import {
  AccountResolutionError,
  getAccessTokenForConnection,
  resolveConnection,
  touchConnection,
} from "@/lib/connections/store";

/**
 * Saving a transcript into Drive.
 *
 * A one-hour podcast is tens of thousands of words, which belongs in a file
 * rather than in a chat window. Everything here degrades to a plain sentence
 * instead of an error: if Drive cannot take the file, the caller still gets
 * the transcript, just inline.
 */

export const TRANSCRIPT_FOLDER = "YouTube transcripts";

export type DriveSaveResult =
  | {
      saved: true;
      account: string;
      fileId: string;
      name: string;
      link?: string;
      folder: string;
      /** True when a file of this name was already in the folder. */
      reused: boolean;
    }
  | { saved: false; reason: string };

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function findOrCreateFolder(token: string) {
  const existing = await searchFiles(token, {
    query: `mimeType = '${FOLDER_MIME}' and name = '${escapeDriveValue(TRANSCRIPT_FOLDER)}'`,
    pageSize: 1,
  });

  return existing.files[0] ?? (await createFolder(token, TRANSCRIPT_FOLDER));
}

export async function saveTranscriptToDrive(input: {
  account?: string;
  name: string;
  content: string;
}): Promise<DriveSaveResult> {
  let connection;

  try {
    connection = await resolveConnection(input.account);
  } catch (error) {
    return {
      saved: false,
      reason:
        error instanceof AccountResolutionError
          ? `${error.message} The transcript is inline below instead.`
          : "No Google account is connected, so the transcript is inline below instead.",
    };
  }

  // The dashboard's per-account read-only lock outranks whatever scopes the
  // connector was granted, exactly as it does for every other write tool.
  if (!connection.permissions.write) {
    return {
      saved: false,
      reason: `${connection.email} is locked to read-only on the dashboard, so nothing was written to Drive. The transcript is inline below.`,
    };
  }

  try {
    const { accessToken } = await getAccessTokenForConnection(connection.id);
    const folder = await findOrCreateFolder(accessToken);
    const existing = await searchFiles(accessToken, {
      query: `name = '${escapeDriveValue(input.name)}'`,
      folderId: folder.id,
      pageSize: 1,
    });

    const file =
      existing.files[0] ??
      (await uploadTextFile(accessToken, {
        name: input.name,
        content: input.content,
        mimeType: "text/plain",
        parentId: folder.id,
      }));

    await touchConnection(connection.id);

    return {
      saved: true,
      account: connection.alias,
      fileId: file.id,
      name: file.name,
      link: file.webViewLink,
      folder: TRANSCRIPT_FOLDER,
      reused: Boolean(existing.files[0]),
    };
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      return {
        saved: false,
        reason: `${connection.email} needs to be reconnected at /dashboard/connections/gmail before anything can be written to Drive. The transcript is inline below.`,
      };
    }

    if (error instanceof GoogleApiError) {
      return {
        saved: false,
        reason: `Drive refused the upload for ${connection.email}: ${error.message}. The transcript is inline below.`,
      };
    }

    return {
      saved: false,
      reason: `Drive upload failed: ${
        error instanceof Error ? error.message : "unknown error"
      }. The transcript is inline below.`,
    };
  }
}
