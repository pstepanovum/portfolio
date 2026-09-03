import "server-only";

import { googleFetch, qs } from "@/lib/connections/google-api";

const BASE = "https://tasks.googleapis.com/tasks/v1";
type Json = Record<string, unknown>;

function toTask(raw: Json) {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    status: String(raw.status ?? "needsAction"),
    due: typeof raw.due === "string" ? raw.due : undefined,
    completed: typeof raw.completed === "string" ? raw.completed : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
  };
}

export async function listTaskLists(token: string) {
  const data = await googleFetch<{ items?: Json[] }>(token, `${BASE}/users/@me/lists`);
  return (data.items ?? []).map((l) => ({ id: String(l.id), title: String(l.title ?? "") }));
}

export async function listTasks(token: string, input: { taskListId?: string; showCompleted?: boolean; dueMin?: string; dueMax?: string; maxResults?: number; pageToken?: string }) {
  const listId = input.taskListId ?? "@default";
  const data = await googleFetch<{ items?: Json[]; nextPageToken?: string }>(token, `${BASE}/lists/${encodeURIComponent(listId)}/tasks${qs({
    showCompleted: input.showCompleted ?? false,
    showHidden: input.showCompleted ?? false,
    dueMin: input.dueMin,
    dueMax: input.dueMax,
    maxResults: Math.min(input.maxResults ?? 50, 100),
    pageToken: input.pageToken,
  })}`);
  return { taskListId: listId, tasks: (data.items ?? []).map(toTask), nextPageToken: data.nextPageToken };
}

export async function createTask(token: string, input: { taskListId?: string; title: string; notes?: string; due?: string }) {
  const listId = input.taskListId ?? "@default";
  return toTask(await googleFetch<Json>(token, `${BASE}/lists/${encodeURIComponent(listId)}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title: input.title, notes: input.notes, due: input.due }),
  }));
}

export async function updateTask(token: string, input: { taskListId?: string; taskId: string; title?: string; notes?: string; due?: string; completed?: boolean }) {
  const listId = input.taskListId ?? "@default";
  const body: Json = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.notes !== undefined) body.notes = input.notes;
  if (input.due !== undefined) body.due = input.due;
  if (input.completed !== undefined) body.status = input.completed ? "completed" : "needsAction";
  return toTask(await googleFetch<Json>(token, `${BASE}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(input.taskId)}`, { method: "PATCH", body: JSON.stringify(body) }));
}

export async function deleteTask(token: string, taskListId: string | undefined, taskId: string) {
  await googleFetch<void>(token, `${BASE}/lists/${encodeURIComponent(taskListId ?? "@default")}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}
