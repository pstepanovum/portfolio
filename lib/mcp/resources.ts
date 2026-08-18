import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  coreValues,
  skillGroups,
  skillProficiency,
  tools as toolEntries,
} from "@/lib/content/background";
import {
  getCertifications,
  getExperiences,
  getProjects,
} from "@/lib/firebase/portfolio";
import { siteConfig } from "@/lib/seo";

function jsonContents(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Resources mirror the read tools for clients that prefer attaching context
 * directly rather than issuing a tool call.
 */
export function registerResources(server: McpServer) {
  server.registerResource(
    "portfolio-overview",
    "portfolio://overview",
    {
      title: "Portfolio overview",
      description:
        "Everything at once: site identity, projects, certifications, timeline, and authored background.",
      mimeType: "application/json",
    },
    async (uri) => {
      const [projects, certifications, experiences] = await Promise.all([
        getProjects(),
        getCertifications(),
        getExperiences(),
      ]);

      return jsonContents(uri, {
        site: {
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
        },
        projects,
        certifications,
        experiences,
        background: {
          values: coreValues,
          skillGroups,
          skillProficiency,
          tools: toolEntries,
        },
      });
    },
  );

  server.registerResource(
    "portfolio-projects",
    "portfolio://projects",
    {
      title: "Projects",
      description: "Every portfolio project with tags, links, and ordering.",
      mimeType: "application/json",
    },
    async (uri) => jsonContents(uri, await getProjects()),
  );

  server.registerResource(
    "portfolio-certifications",
    "portfolio://certifications",
    {
      title: "Certifications",
      description: "Every certification with issuer, date, and credential details.",
      mimeType: "application/json",
    },
    async (uri) => jsonContents(uri, await getCertifications()),
  );

  server.registerResource(
    "portfolio-experience",
    "portfolio://experience",
    {
      title: "Timeline",
      description: "Work and research timeline entries from the About page.",
      mimeType: "application/json",
    },
    async (uri) => jsonContents(uri, await getExperiences()),
  );

  server.registerResource(
    "portfolio-skills",
    "portfolio://skills",
    {
      title: "Skills and values",
      description:
        "Skill groups, proficiency levels, tooling, and core values authored in code.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonContents(uri, {
        values: coreValues,
        skillGroups,
        skillProficiency,
        tools: toolEntries,
      }),
  );
}
