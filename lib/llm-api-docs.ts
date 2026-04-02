import type { DashboardSettings } from "@/types/content";
import { absoluteUrl } from "@/lib/seo";

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildProjectApiMarkdown(settings: DashboardSettings) {
  const exampleBody = {
    title: "AI-Powered Portfolio CMS",
    description:
      "Built a private Firebase-backed CMS for managing portfolio projects, certifications, and timeline entries with Gemini-assisted drafting and storage-backed image uploads.",
    tags: ["Next.js", "Firebase", "Gemini", "TypeScript"],
    category: "webApps",
    image:
      "https://firebasestorage.googleapis.com/v0/b/pstepanovdev.firebasestorage.app/o/projects%2Fyour-image.webp?alt=media&token=replace-me",
    github: "https://github.com/pstepanovum/portfolio",
    demo: "https://pstepanov.dev",
    order: 5,
  };

  return `# Portfolio Projects Write API

Use this API to create a brand-new project entry that will appear on the public portfolio website.

Base URL: ${absoluteUrl("/")}

Authentication:
- Header \`x-portfolio-public-key\`: \`${settings.llmPublicKey}\`
- Header \`Authorization\`: \`Bearer ${settings.llmSecretKey}\`

Endpoint:
- \`GET ${absoluteUrl("/api/llm/overview")}\`
- \`GET ${absoluteUrl("/api/llm/projects")}\`
- \`GET ${absoluteUrl("/api/llm/projects/{projectId}")}\`
- \`POST ${absoluteUrl("/api/llm/projects")}\`

Rules:
- \`category\` must be one of: \`featured\`, \`webApps\`, \`ai\`
- \`tags\` must be an array of short strings
- \`image\` must be a full image URL
- \`order\` is a number used for sorting within the section

JSON body example:
\`\`\`json
${prettyJson(exampleBody)}
\`\`\`

cURL example:
\`\`\`bash
curl -X POST '${absoluteUrl("/api/llm/projects")}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-portfolio-public-key: ${settings.llmPublicKey}' \\
  -H 'Authorization: Bearer ${settings.llmSecretKey}' \\
  -d '${JSON.stringify(exampleBody)}'
\`\`\`

Success response:
- Returns \`{ "project": { ... } }\`
- The created project is stored in Firestore and will be used by the public Projects page

Read helpers:
- Use \`GET /api/llm/overview\` to inspect the full portfolio overview before writing
- Use \`GET /api/llm/projects\` to extract every current project
- Use \`GET /api/llm/projects/{projectId}\` to inspect one project in full detail
`;
}

export function buildExperienceApiMarkdown(settings: DashboardSettings) {
  const exampleBody = {
    date: "Apr 2026 - Present",
    title: "Founder & Full Stack Engineer",
    company: "Pavel Stepanov Portfolio",
    description:
      "Built and maintain a Firebase-backed portfolio CMS with private admin tools, AI-assisted content workflows, and structured SEO-ready content management.",
    location: "Miami, FL",
    type: "Independent",
    achievements: [
      "Built a secure admin dashboard with Firebase Auth session cookies",
      "Moved projects, certifications, and timeline content into Firestore",
      "Added Gemini-assisted project drafting and LLM-friendly write APIs",
    ],
    tech: ["Next.js", "Firebase", "TypeScript", "Gemini"],
    order: 1,
  };

  return `# Portfolio Timeline Write API

Use this API to create a new timeline/work entry for the About page.

Base URL: ${absoluteUrl("/")}

Authentication:
- Header \`x-portfolio-public-key\`: \`${settings.llmPublicKey}\`
- Header \`Authorization\`: \`Bearer ${settings.llmSecretKey}\`

Endpoint:
- \`GET ${absoluteUrl("/api/llm/overview")}\`
- \`POST ${absoluteUrl("/api/llm/experience")}\`

Rules:
- \`achievements\` must be an array of strings
- \`tech\` must be an array of strings
- \`order\` is a number used for sorting on the About page timeline

JSON body example:
\`\`\`json
${prettyJson(exampleBody)}
\`\`\`

cURL example:
\`\`\`bash
curl -X POST '${absoluteUrl("/api/llm/experience")}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-portfolio-public-key: ${settings.llmPublicKey}' \\
  -H 'Authorization: Bearer ${settings.llmSecretKey}' \\
  -d '${JSON.stringify(exampleBody)}'
\`\`\`

Success response:
- Returns \`{ "experience": { ... } }\`
- The created timeline entry is stored in Firestore and rendered on the public About page

Read helper:
- Use \`GET /api/llm/overview\` first when the model should understand the broader portfolio before creating a new timeline entry
`;
}
