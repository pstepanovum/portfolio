import "server-only";

import { googleFetch } from "@/lib/connections/google-api";

const BASE = "https://docs.googleapis.com/v1/documents";
type Json = Record<string, unknown>;

/** Flattens the Docs structural tree to the text a model can read. */
function extractText(document: Json) {
  const body = (document.body as Json | undefined)?.content as Json[] | undefined;
  const out: string[] = [];

  const walk = (elements: Json[] | undefined) => {
    for (const element of elements ?? []) {
      const paragraph = element.paragraph as Json | undefined;
      if (paragraph) {
        for (const run of (paragraph.elements as Json[] | undefined) ?? []) {
          const text = (run.textRun as Json | undefined)?.content;
          if (typeof text === "string") out.push(text);
        }
      }
      const table = element.table as Json | undefined;
      if (table) {
        for (const row of (table.tableRows as Json[] | undefined) ?? []) {
          for (const cell of (row.tableCells as Json[] | undefined) ?? []) walk(cell.content as Json[] | undefined);
          out.push("\n");
        }
      }
    }
  };

  walk(body);
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export async function getDocument(token: string, documentId: string) {
  const document = await googleFetch<Json>(token, `${BASE}/${encodeURIComponent(documentId)}`);
  return {
    documentId: String(document.documentId),
    title: String(document.title ?? ""),
    url: `https://docs.google.com/document/d/${document.documentId}/edit`,
    text: extractText(document),
  };
}

export async function createDocument(token: string, title: string, content?: string) {
  const document = await googleFetch<Json>(token, BASE, { method: "POST", body: JSON.stringify({ title }) });
  const documentId = String(document.documentId);

  if (content) {
    await googleFetch<Json>(token, `${BASE}/${encodeURIComponent(documentId)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] }),
    });
  }

  return { documentId, title, url: `https://docs.google.com/document/d/${documentId}/edit` };
}

export async function appendText(token: string, documentId: string, text: string) {
  await googleFetch<Json>(token, `${BASE}/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ insertText: { endOfSegmentLocation: {}, text } }] }),
  });
  return { documentId, appended: text.length };
}

export async function replaceText(token: string, documentId: string, find: string, replace: string, matchCase = true) {
  const data = await googleFetch<{ replies?: { replaceAllText?: { occurrencesChanged?: number } }[] }>(token, `${BASE}/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ replaceAllText: { containsText: { text: find, matchCase }, replaceText: replace } }] }),
  });
  return { documentId, occurrencesChanged: data.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0 };
}
