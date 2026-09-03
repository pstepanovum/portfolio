import "server-only";

import { googleFetch, qs } from "@/lib/connections/google-api";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";
type Json = Record<string, unknown>;
export type CellValue = string | number | boolean | null;

export async function getSpreadsheet(token: string, spreadsheetId: string) {
  const data = await googleFetch<Json>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}${qs({ fields: "spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index,gridProperties)" })}`);
  return {
    spreadsheetId: String(data.spreadsheetId),
    title: String((data.properties as Json | undefined)?.title ?? ""),
    url: typeof data.spreadsheetUrl === "string" ? data.spreadsheetUrl : undefined,
    sheets: ((data.sheets as Json[] | undefined) ?? []).map((s) => {
      const p = s.properties as Json;
      const grid = (p.gridProperties as Json | undefined) ?? {};
      return { sheetId: p.sheetId, title: String(p.title), index: p.index, rows: grid.rowCount, columns: grid.columnCount };
    }),
  };
}

export async function readRange(token: string, spreadsheetId: string, range: string) {
  const data = await googleFetch<{ range?: string; values?: CellValue[][] }>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${qs({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" })}`);
  return { range: data.range ?? range, values: data.values ?? [] };
}

export async function createSpreadsheet(token: string, title: string, sheetTitles?: string[]) {
  const data = await googleFetch<Json>(token, BASE, {
    method: "POST",
    body: JSON.stringify({ properties: { title }, ...(sheetTitles?.length ? { sheets: sheetTitles.map((t) => ({ properties: { title: t } })) } : {}) }),
  });
  return { spreadsheetId: String(data.spreadsheetId), url: typeof data.spreadsheetUrl === "string" ? data.spreadsheetUrl : undefined, title };
}

export async function writeRange(token: string, spreadsheetId: string, range: string, values: CellValue[][], rawInput = false) {
  return googleFetch<Json>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${qs({ valueInputOption: rawInput ? "RAW" : "USER_ENTERED" })}`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

export async function appendRows(token: string, spreadsheetId: string, range: string, values: CellValue[][], rawInput = false) {
  return googleFetch<Json>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append${qs({ valueInputOption: rawInput ? "RAW" : "USER_ENTERED", insertDataOption: "INSERT_ROWS" })}`, {
    method: "POST",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

export async function clearRange(token: string, spreadsheetId: string, range: string) {
  return googleFetch<Json>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`, { method: "POST", body: "{}" });
}

export async function addSheet(token: string, spreadsheetId: string, title: string) {
  return googleFetch<Json>(token, `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
}
