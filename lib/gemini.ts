import "server-only";

import { GoogleGenAI } from "@google/genai";
import { geminiDraftResponseSchema } from "@/lib/firebase/schemas";
import { getDashboardSettings } from "@/lib/firebase/portfolio";

const projectDraftResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    category: {
      type: "string",
      enum: ["featured", "webApps", "ai"],
    },
    github: { type: "string" },
    demo: { type: "string" },
  },
  required: ["title", "description", "tags", "category"],
} as const;

export async function generateProjectDraft(notes: string) {
  const settings = await getDashboardSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Add it in dashboard settings or your environment before using the project draft assistant.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: settings.geminiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: [
      `Create a portfolio project draft from these notes:\n\n${notes}`,
    ],
    config: {
      systemInstruction: `${settings.projectDraftPrompt}

Return JSON only. Allowed categories: featured, webApps, ai. Keep tags short and concrete. If a URL is unknown, omit it.`,
      responseMimeType: "application/json",
      responseSchema: projectDraftResponseSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  return geminiDraftResponseSchema.parse(JSON.parse(response.text));
}
