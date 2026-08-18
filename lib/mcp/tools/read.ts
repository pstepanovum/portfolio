import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  coreValues,
  skillGroups,
  skillProficiency,
  tools as toolEntries,
} from "@/lib/content/background";
import {
  getCertificationById,
  getCertifications,
  getDashboardSettings,
  getExperienceById,
  getExperiences,
  getProjectById,
  getProjects,
} from "@/lib/firebase/portfolio";
import { jsonResult, notFoundResult } from "@/lib/mcp/format";
import { siteConfig } from "@/lib/seo";
import { projectCategories } from "@/types/content";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function getBackground() {
  return {
    values: coreValues,
    skillGroups,
    skillProficiency,
    tools: toolEntries,
  };
}

/**
 * Resume details are settings-derived, so they are projected explicitly.
 * Never spread DashboardSettings into a response: it holds the Gemini API key
 * and the resume password.
 */
async function getResumeStatus() {
  const settings = await getDashboardSettings();

  return {
    available: Boolean(settings.resumeUrl),
    isPublic: settings.resumeIsPublic,
    requiresPassword: Boolean(settings.resumeUrl && !settings.resumeIsPublic),
    url: settings.resumeIsPublic && settings.resumeUrl ? settings.resumeUrl : undefined,
  };
}

export function registerReadTools(server: McpServer) {
  server.registerTool(
    "get_portfolio_overview",
    {
      title: "Get portfolio overview",
      description:
        "Read the complete portfolio in one call: site identity, every project, certification, and timeline entry, plus skills, values, tools, and resume availability. Start here when you need broad context before making changes.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const [projects, certifications, experiences, resume] = await Promise.all([
        getProjects(),
        getCertifications(),
        getExperiences(),
        getResumeStatus(),
      ]);

      return jsonResult({
        site: {
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
          email: siteConfig.email,
          github: siteConfig.github,
          linkedin: siteConfig.linkedin,
        },
        counts: {
          projects: projects.length,
          certifications: certifications.length,
          experiences: experiences.length,
        },
        projects,
        certifications,
        experiences,
        background: getBackground(),
        resume,
      });
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "List portfolio projects, optionally filtered to one category. Returns full project records including tags, links, and ordering.",
      inputSchema: {
        category: z
          .enum(projectCategories)
          .optional()
          .describe("Restrict results to a single category."),
      },
      annotations: READ_ONLY,
    },
    async ({ category }) => {
      const projects = await getProjects();
      const filtered = category
        ? projects.filter((project) => project.category === category)
        : projects;

      return jsonResult({ count: filtered.length, projects: filtered });
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      description: "Read one project in full detail by its id.",
      inputSchema: {
        id: z.string().min(1).describe("The project id."),
      },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const project = await getProjectById(id);

      return project
        ? jsonResult({ project })
        : notFoundResult("project", id);
    },
  );

  server.registerTool(
    "list_certifications",
    {
      title: "List certifications",
      description:
        "List every certification with issuer, date, credential id, skills, and verification URL.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const certifications = await getCertifications();

      return jsonResult({ count: certifications.length, certifications });
    },
  );

  server.registerTool(
    "get_certification",
    {
      title: "Get certification",
      description: "Read one certification in full detail by its id.",
      inputSchema: {
        id: z.string().min(1).describe("The certification id."),
      },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const certification = await getCertificationById(id);

      return certification
        ? jsonResult({ certification })
        : notFoundResult("certification", id);
    },
  );

  server.registerTool(
    "list_experience",
    {
      title: "List timeline entries",
      description:
        "List every work and research timeline entry shown on the About page, including achievements and tech used.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const experiences = await getExperiences();

      return jsonResult({ count: experiences.length, experiences });
    },
  );

  server.registerTool(
    "get_experience",
    {
      title: "Get timeline entry",
      description: "Read one timeline entry in full detail by its id.",
      inputSchema: {
        id: z.string().min(1).describe("The timeline entry id."),
      },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const experience = await getExperienceById(id);

      return experience
        ? jsonResult({ experience })
        : notFoundResult("timeline entry", id);
    },
  );

  server.registerTool(
    "get_skills_and_values",
    {
      title: "Get skills and values",
      description:
        "Read the skill groups, proficiency levels, tooling, and core values shown on the About and Skills pages. These are authored in code rather than the database and are read-only.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => jsonResult(getBackground()),
  );

  server.registerTool(
    "get_resume_status",
    {
      title: "Get resume status",
      description:
        "Check whether a resume is published and whether it is public or password protected. The download URL is returned only when the resume is public.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => jsonResult(await getResumeStatus()),
  );
}
