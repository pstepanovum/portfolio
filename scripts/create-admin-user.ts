import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const email = getArg("--email");
  const password = getArg("--password");
  const displayName = getArg("--display-name") || "Portfolio Admin";

  if (!email || !password) {
    console.error(
      "Usage: npm run firebase:create-admin -- --email you@example.com --password your-password [--display-name \"Your Name\"]",
    );
    process.exit(1);
  }

  const { adminAuth } = await import("../lib/firebase/admin-core");

  let userRecord;

  try {
    userRecord = await adminAuth.getUserByEmail(email);
    userRecord = await adminAuth.updateUser(userRecord.uid, {
      email,
      password,
      displayName,
      emailVerified: true,
    });
    console.log(`Updated existing Firebase user: ${email}`);
  } catch (error) {
    const errorCode =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";

    if (errorCode !== "auth/user-not-found") {
      throw error;
    }

    userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    console.log(`Created Firebase user: ${email}`);
  }

  await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });
  await adminAuth.revokeRefreshTokens(userRecord.uid);

  console.log(`Granted admin access to ${email}.`);
  console.log("Sign out and back in once so the admin claim refreshes in the browser.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
