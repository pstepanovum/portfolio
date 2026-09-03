import "server-only";

import { randomUUID } from "node:crypto";
import { googleFetch, qs } from "@/lib/connections/google-api";

const BASE = "https://www.googleapis.com/calendar/v3";
type Json = Record<string, unknown>;

export type CalendarEvent = {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  status?: string;
  htmlLink?: string;
  meetLink?: string;
  attendees: { email: string; responseStatus?: string; organizer?: boolean }[];
  organizer?: string;
  updated?: string;
};

function toEvent(calendarId: string, raw: Json): CalendarEvent {
  const start = raw.start as Json | undefined;
  const end = raw.end as Json | undefined;

  return {
    id: String(raw.id),
    calendarId,
    summary: typeof raw.summary === "string" ? raw.summary : "(no title)",
    description: typeof raw.description === "string" ? raw.description : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
    start: String(start?.dateTime ?? start?.date ?? ""),
    end: String(end?.dateTime ?? end?.date ?? ""),
    allDay: Boolean(start?.date),
    status: typeof raw.status === "string" ? raw.status : undefined,
    htmlLink: typeof raw.htmlLink === "string" ? raw.htmlLink : undefined,
    meetLink: typeof raw.hangoutLink === "string" ? raw.hangoutLink : undefined,
    attendees: Array.isArray(raw.attendees)
      ? (raw.attendees as Json[]).map((a) => ({
          email: String(a.email),
          responseStatus: typeof a.responseStatus === "string" ? a.responseStatus : undefined,
          organizer: Boolean(a.organizer),
        }))
      : [],
    organizer: typeof (raw.organizer as Json | undefined)?.email === "string" ? String((raw.organizer as Json).email) : undefined,
    updated: typeof raw.updated === "string" ? raw.updated : undefined,
  };
}

export async function listCalendars(token: string) {
  const data = await googleFetch<{ items?: Json[] }>(token, `${BASE}/users/me/calendarList`);
  return (data.items ?? []).map((c) => ({
    id: String(c.id),
    summary: String(c.summary ?? ""),
    primary: Boolean(c.primary),
    accessRole: String(c.accessRole ?? ""),
    timeZone: typeof c.timeZone === "string" ? c.timeZone : undefined,
  }));
}

export async function listEvents(
  token: string,
  input: { calendarId?: string; timeMin?: string; timeMax?: string; query?: string; maxResults?: number; pageToken?: string },
) {
  const calendarId = input.calendarId ?? "primary";
  const data = await googleFetch<{ items?: Json[]; nextPageToken?: string; timeZone?: string }>(
    token,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events${qs({
      timeMin: input.timeMin ?? new Date().toISOString(),
      timeMax: input.timeMax,
      q: input.query,
      maxResults: Math.min(input.maxResults ?? 25, 250),
      pageToken: input.pageToken,
      singleEvents: true,
      orderBy: "startTime",
    })}`,
  );

  return {
    timeZone: data.timeZone,
    events: (data.items ?? []).map((e) => toEvent(calendarId, e)),
    nextPageToken: data.nextPageToken,
  };
}

export async function getEvent(token: string, calendarId: string, eventId: string) {
  const raw = await googleFetch<Json>(token, `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
  return toEvent(calendarId, raw);
}

export type EventInput = {
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  allDay?: boolean;
  attendees?: string[];
  addMeetLink?: boolean;
};

function toBody(input: EventInput): Json {
  const time = (value: string | undefined) =>
    value === undefined
      ? undefined
      : input.allDay
        ? { date: value.slice(0, 10) }
        : { dateTime: value, ...(input.timeZone ? { timeZone: input.timeZone } : {}) };

  const body: Json = {};
  if (input.summary !== undefined) body.summary = input.summary;
  if (input.description !== undefined) body.description = input.description;
  if (input.location !== undefined) body.location = input.location;
  if (input.start !== undefined) body.start = time(input.start);
  if (input.end !== undefined) body.end = time(input.end);
  if (input.attendees !== undefined) body.attendees = input.attendees.map((email) => ({ email }));
  if (input.addMeetLink) {
    body.conferenceData = {
      createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  return body;
}

export async function createEvent(token: string, calendarId: string, input: EventInput) {
  const raw = await googleFetch<Json>(
    token,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events${qs({ conferenceDataVersion: 1, sendUpdates: "all" })}`,
    { method: "POST", body: JSON.stringify(toBody(input)) },
  );
  return toEvent(calendarId, raw);
}

export async function updateEvent(token: string, calendarId: string, eventId: string, input: EventInput) {
  const raw = await googleFetch<Json>(
    token,
    `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${qs({ conferenceDataVersion: 1, sendUpdates: "all" })}`,
    { method: "PATCH", body: JSON.stringify(toBody(input)) },
  );
  return toEvent(calendarId, raw);
}

export async function deleteEvent(token: string, calendarId: string, eventId: string) {
  await googleFetch<void>(token, `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${qs({ sendUpdates: "all" })}`, { method: "DELETE" });
}

/** Calendar's own natural-language parser: "Lunch with Ann Friday 1pm". */
export async function quickAddEvent(token: string, calendarId: string, text: string) {
  const raw = await googleFetch<Json>(token, `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/quickAdd${qs({ text, sendUpdates: "all" })}`, { method: "POST" });
  return toEvent(calendarId, raw);
}

export async function getFreeBusy(token: string, input: { timeMin: string; timeMax: string; calendarIds?: string[] }) {
  const data = await googleFetch<{ calendars?: Record<string, { busy?: { start: string; end: string }[] }> }>(
    token,
    `${BASE}/freeBusy`,
    { method: "POST", body: JSON.stringify({ timeMin: input.timeMin, timeMax: input.timeMax, items: (input.calendarIds ?? ["primary"]).map((id) => ({ id })) }) },
  );
  return Object.entries(data.calendars ?? {}).map(([id, value]) => ({ calendarId: id, busy: value.busy ?? [] }));
}
