import "server-only";

import { GmailApiError } from "@/lib/connections/gmail";

const PEOPLE_BASE = "https://people.googleapis.com/v1";

const CONTACT_FIELDS = "names,emailAddresses,phoneNumbers,organizations,photos";
const SELF_FIELDS =
  "names,emailAddresses,phoneNumbers,addresses,birthdays,locales,photos,organizations";

type Json = Record<string, unknown>;

async function peopleFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${PEOPLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GmailApiError(
      data.error?.message || `People API returned HTTP ${response.status}.`,
      response.status,
    );
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

function firstValue(person: Json, key: string, field = "value") {
  const list = person[key];
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const entry = list[0] as Json;
  return typeof entry[field] === "string" ? (entry[field] as string) : undefined;
}

/** Flattens the People API's nested shape into what a model actually needs. */
function toContact(person: Json) {
  const emails = Array.isArray(person.emailAddresses)
    ? (person.emailAddresses as Json[]).map((e) => e.value).filter((v): v is string => typeof v === "string")
    : [];
  const phones = Array.isArray(person.phoneNumbers)
    ? (person.phoneNumbers as Json[]).map((e) => e.value).filter((v): v is string => typeof v === "string")
    : [];

  return {
    resourceName: typeof person.resourceName === "string" ? person.resourceName : undefined,
    name: firstValue(person, "names", "displayName"),
    emails,
    phones,
    organization: firstValue(person, "organizations", "name"),
    title: firstValue(person, "organizations", "title"),
    photo: firstValue(person, "photos", "url"),
  };
}

/**
 * Searches saved contacts and, when asked, "other contacts": the people you
 * have emailed but never saved, which is usually where the address the user is
 * thinking of actually lives.
 */
export async function searchContacts(
  accessToken: string,
  input: { query: string; includeOtherContacts?: boolean; pageSize?: number },
) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 30);
  const params = new URLSearchParams({
    query: input.query,
    pageSize: String(pageSize),
    readMask: CONTACT_FIELDS,
  });

  const saved = await peopleFetch<{ results?: { person: Json }[] }>(
    accessToken,
    `/people:searchContacts?${params}`,
  );
  const contacts = (saved.results ?? []).map((r) => ({ source: "contacts", ...toContact(r.person) }));

  if (input.includeOtherContacts !== false) {
    const otherParams = new URLSearchParams({
      query: input.query,
      pageSize: String(pageSize),
      readMask: "names,emailAddresses,phoneNumbers",
    });
    const other = await peopleFetch<{ results?: { person: Json }[] }>(
      accessToken,
      `/otherContacts:search?${otherParams}`,
    );
    contacts.push(...(other.results ?? []).map((r) => ({ source: "otherContacts", ...toContact(r.person) })));
  }

  return { count: contacts.length, contacts };
}

export async function listContacts(
  accessToken: string,
  input: { pageSize?: number; pageToken?: string },
) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(Math.max(input.pageSize ?? 25, 1), 100)),
    personFields: CONTACT_FIELDS,
    sortOrder: "LAST_MODIFIED_DESCENDING",
  });
  if (input.pageToken) params.set("pageToken", input.pageToken);

  const data = await peopleFetch<{ connections?: Json[]; nextPageToken?: string; totalPeople?: number }>(
    accessToken,
    `/people/me/connections?${params}`,
  );

  return {
    totalPeople: data.totalPeople ?? 0,
    contacts: (data.connections ?? []).map(toContact),
    nextPageToken: data.nextPageToken,
  };
}

/** The account holder's own profile: name, addresses, phones, birthday, locale. */
export async function getSelfProfile(accessToken: string) {
  const person = await peopleFetch<Json>(
    accessToken,
    `/people/me?personFields=${encodeURIComponent(SELF_FIELDS)}`,
  );

  const pick = (key: string, field: string) =>
    Array.isArray(person[key])
      ? (person[key] as Json[]).map((e) => e[field]).filter((v) => v !== undefined)
      : [];

  return {
    name: firstValue(person, "names", "displayName"),
    emails: pick("emailAddresses", "value"),
    phones: pick("phoneNumbers", "value"),
    addresses: pick("addresses", "formattedValue"),
    birthdays: Array.isArray(person.birthdays) ? (person.birthdays as Json[]).map((b) => b.date) : [],
    locales: pick("locales", "value"),
    organizations: pick("organizations", "name"),
    photo: firstValue(person, "photos", "url"),
  };
}
