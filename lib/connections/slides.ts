import "server-only";

import { googleFetch } from "@/lib/connections/google-api";

const BASE = "https://slides.googleapis.com/v1/presentations";
type Json = Record<string, unknown>;

export async function getPresentation(token: string, presentationId: string) {
  const data = await googleFetch<Json>(token, `${BASE}/${encodeURIComponent(presentationId)}`);
  const slides = ((data.slides as Json[] | undefined) ?? []).map((slide, index) => {
    const text: string[] = [];
    for (const element of (slide.pageElements as Json[] | undefined) ?? []) {
      const runs = ((element.shape as Json | undefined)?.text as Json | undefined)?.textElements as Json[] | undefined;
      for (const run of runs ?? []) {
        const content = (run.textRun as Json | undefined)?.content;
        if (typeof content === "string") text.push(content);
      }
    }
    return { index: index + 1, objectId: String(slide.objectId), text: text.join("").trim() };
  });

  return {
    presentationId: String(data.presentationId),
    title: String(data.title ?? ""),
    url: `https://docs.google.com/presentation/d/${data.presentationId}/edit`,
    slideCount: slides.length,
    slides,
  };
}

export async function createPresentation(token: string, title: string) {
  const data = await googleFetch<Json>(token, BASE, { method: "POST", body: JSON.stringify({ title }) });
  return { presentationId: String(data.presentationId), title, url: `https://docs.google.com/presentation/d/${data.presentationId}/edit` };
}
