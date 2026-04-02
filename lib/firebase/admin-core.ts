import fs from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type Credential,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getCredential(): Credential {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

  if (!configuredPath) {
    return applicationDefault();
  }

  const resolvedPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  if (!fs.existsSync(resolvedPath)) {
    return applicationDefault();
  }

  return cert(
    JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as ServiceAccount,
  );
}

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: getCredential(),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
