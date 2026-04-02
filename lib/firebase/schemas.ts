import { z } from "zod";
import { projectCategories } from "@/types/content";

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().url().optional(),
);

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(4000),
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(4000),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  category: z.enum(projectCategories),
  github: optionalUrlSchema,
  demo: optionalUrlSchema,
  image: z.string().trim().min(1),
  imageStoragePath: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).max(9999),
});

export const certificationInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  issuer: z.string().trim().min(2).max(120),
  date: z.string().trim().min(2).max(120),
  credentialId: z.string().trim().optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  logo: z.string().trim().optional(),
  logoStoragePath: z.string().trim().optional(),
  verificationUrl: optionalUrlSchema,
  order: z.coerce.number().int().min(0).max(9999),
});

export const experienceInputSchema = z.object({
  date: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(200),
  company: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(4000),
  location: z.string().trim().optional(),
  type: z.string().trim().optional(),
  achievements: z.array(z.string().trim().min(1).max(300)).optional(),
  tech: z.array(z.string().trim().min(1).max(80)).optional(),
  order: z.coerce.number().int().min(0).max(9999),
});

export const dashboardSettingsSchema = z.object({
  geminiModel: z.string().trim().min(2).max(80),
  geminiApiKey: z.string().trim().max(400).optional().default(""),
  projectDraftPrompt: z.string().trim().min(10).max(4000),
  llmPublicKey: z.string().trim().min(10).max(200),
  llmSecretKey: z.string().trim().min(16).max(200),
  resumeUrl: optionalUrlSchema.default(""),
  resumeStoragePath: z.string().trim().optional().default(""),
  resumePassword: z.string().trim().max(200).optional().default(""),
  resumeIsPublic: z.boolean().default(false),
});

export const contactStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export const geminiDraftRequestSchema = z.object({
  notes: z.string().trim().min(10).max(4000),
});

export const geminiDraftResponseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(4000),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  category: z.enum(projectCategories),
  github: optionalUrlSchema,
  demo: optionalUrlSchema,
});
