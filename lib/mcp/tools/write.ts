import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createCertification,
  createExperience,
  createProject,
  deleteCertification,
  deleteExperience,
  deleteProject,
  getCertificationById,
  getExperienceById,
  getProjectById,
  updateCertification,
  updateExperience,
  updateProject,
} from "@/lib/firebase/portfolio";
import {
  certificationInputSchema,
  experienceInputSchema,
  projectInputSchema,
} from "@/lib/firebase/schemas";
import { deleteStoredFile } from "@/lib/firebase/storage";
import { generateProjectDraft } from "@/lib/gemini";
import { errorResult, jsonResult, notFoundResult } from "@/lib/mcp/format";

// Storage paths are managed by the upload pipeline in the dashboard. Exposing
// them as tool inputs would let a client point a record at someone else's
// object and have it deleted on the next update.
const projectFields = projectInputSchema.omit({ imageStoragePath: true });
const certificationFields = certificationInputSchema.omit({
  logoStoragePath: true,
});

const CREATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const UPDATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const DELETE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function hasUpdates(updates: Record<string, unknown>) {
  return Object.values(updates).some((value) => value !== undefined);
}

export function registerWriteTools(server: McpServer) {
  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description:
        "Add a new project to the public Projects page. Category must be featured, webApps, or ai. The image must be a full URL; upload files through the dashboard first if you need one hosted.",
      inputSchema: projectFields.shape,
      annotations: CREATE_ANNOTATIONS,
    },
    async (input) => {
      try {
        const project = await createProject(input);

        return jsonResult({ created: true, project });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to create the project."),
        );
      }
    },
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description:
        "Change one or more fields on an existing project. Only the fields you supply are modified.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the project to update."),
        ...projectFields.partial().shape,
      },
      annotations: UPDATE_ANNOTATIONS,
    },
    async ({ id, ...updates }) => {
      if (!hasUpdates(updates)) {
        return errorResult("Supply at least one field to update.");
      }

      const existing = await getProjectById(id);

      if (!existing) {
        return notFoundResult("project", id);
      }

      try {
        const project = await updateProject(id, updates);

        return jsonResult({ updated: true, project });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to update the project."),
        );
      }
    },
  );

  server.registerTool(
    "delete_project",
    {
      title: "Delete project",
      description:
        "Permanently remove a project from the public site, including any image stored for it. This cannot be undone.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the project to delete."),
      },
      annotations: DELETE_ANNOTATIONS,
    },
    async ({ id }) => {
      const existing = await getProjectById(id);

      if (!existing) {
        return notFoundResult("project", id);
      }

      try {
        await deleteProject(id);

        if (existing.imageStoragePath) {
          await deleteStoredFile(existing.imageStoragePath);
        }

        return jsonResult({ deleted: true, id, title: existing.title });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to delete the project."),
        );
      }
    },
  );

  server.registerTool(
    "create_certification",
    {
      title: "Create certification",
      description:
        "Add a certification to the Skills page, with issuer, date, credential id, related skills, and an optional verification URL.",
      inputSchema: certificationFields.shape,
      annotations: CREATE_ANNOTATIONS,
    },
    async (input) => {
      try {
        const certification = await createCertification(input);

        return jsonResult({ created: true, certification });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to create the certification."),
        );
      }
    },
  );

  server.registerTool(
    "update_certification",
    {
      title: "Update certification",
      description:
        "Change one or more fields on an existing certification. Only the fields you supply are modified.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the certification to update."),
        ...certificationFields.partial().shape,
      },
      annotations: UPDATE_ANNOTATIONS,
    },
    async ({ id, ...updates }) => {
      if (!hasUpdates(updates)) {
        return errorResult("Supply at least one field to update.");
      }

      const existing = await getCertificationById(id);

      if (!existing) {
        return notFoundResult("certification", id);
      }

      try {
        const certification = await updateCertification(id, updates);

        return jsonResult({ updated: true, certification });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to update the certification."),
        );
      }
    },
  );

  server.registerTool(
    "delete_certification",
    {
      title: "Delete certification",
      description:
        "Permanently remove a certification, including any logo stored for it. This cannot be undone.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the certification to delete."),
      },
      annotations: DELETE_ANNOTATIONS,
    },
    async ({ id }) => {
      const existing = await getCertificationById(id);

      if (!existing) {
        return notFoundResult("certification", id);
      }

      try {
        await deleteCertification(id);

        if (existing.logoStoragePath) {
          await deleteStoredFile(existing.logoStoragePath);
        }

        return jsonResult({ deleted: true, id, title: existing.title });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to delete the certification."),
        );
      }
    },
  );

  server.registerTool(
    "create_experience",
    {
      title: "Create timeline entry",
      description:
        "Add a work or research entry to the About page timeline, with achievements and the tech used.",
      inputSchema: experienceInputSchema.shape,
      annotations: CREATE_ANNOTATIONS,
    },
    async (input) => {
      try {
        const experience = await createExperience(input);

        return jsonResult({ created: true, experience });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to create the timeline entry."),
        );
      }
    },
  );

  server.registerTool(
    "update_experience",
    {
      title: "Update timeline entry",
      description:
        "Change one or more fields on an existing timeline entry. Only the fields you supply are modified.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the timeline entry to update."),
        ...experienceInputSchema.partial().shape,
      },
      annotations: UPDATE_ANNOTATIONS,
    },
    async ({ id, ...updates }) => {
      if (!hasUpdates(updates)) {
        return errorResult("Supply at least one field to update.");
      }

      const existing = await getExperienceById(id);

      if (!existing) {
        return notFoundResult("timeline entry", id);
      }

      try {
        const experience = await updateExperience(id, updates);

        return jsonResult({ updated: true, experience });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to update the timeline entry."),
        );
      }
    },
  );

  server.registerTool(
    "delete_experience",
    {
      title: "Delete timeline entry",
      description:
        "Permanently remove a timeline entry from the About page. This cannot be undone.",
      inputSchema: {
        id: z.string().min(1).describe("The id of the timeline entry to delete."),
      },
      annotations: DELETE_ANNOTATIONS,
    },
    async ({ id }) => {
      const existing = await getExperienceById(id);

      if (!existing) {
        return notFoundResult("timeline entry", id);
      }

      try {
        await deleteExperience(id);

        return jsonResult({ deleted: true, id, title: existing.title });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to delete the timeline entry."),
        );
      }
    },
  );

  server.registerTool(
    "draft_project_from_notes",
    {
      title: "Draft a project from notes",
      description:
        "Turn rough notes into a structured project draft using the portfolio's configured Gemini model and house prompt. Returns the draft only; call create_project to publish it.",
      inputSchema: {
        notes: z
          .string()
          .trim()
          .min(10)
          .max(4000)
          .describe("Rough notes describing the project."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ notes }) => {
      try {
        const draft = await generateProjectDraft(notes);

        return jsonResult({ draft });
      } catch (error) {
        return errorResult(
          toErrorMessage(error, "Unable to generate the project draft."),
        );
      }
    },
  );
}
