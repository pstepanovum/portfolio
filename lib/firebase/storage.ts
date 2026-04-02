import "server-only";

import { uploadBufferToStorage } from "@/lib/firebase/storage-core";

export async function uploadFileToStorage(file: File, folder: string) {
  return uploadBufferToStorage(Buffer.from(await file.arrayBuffer()), {
    folder,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
}

export { deleteStoredFile } from "@/lib/firebase/storage-core";
