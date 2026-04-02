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

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const force = process.argv.includes("--force");

  const { seedDefaultPortfolioContent } = await import(
    "../lib/firebase/portfolio-core"
  );

  const result = await seedDefaultPortfolioContent(force);

  if (!result.seeded) {
    console.log(
      "Firestore already contains portfolio content. Re-run with --force to replace it.",
    );
    return;
  }

  console.log(
    `Seeded Firestore with the current portfolio projects, certifications, timeline, and settings. Uploaded ${result.uploadedAssets} local assets into Firebase Storage.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
