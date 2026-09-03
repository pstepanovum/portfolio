import "server-only";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_LIST_RESULTS = 50;
const METADATA_HEADERS = ["Subject", "From", "To", "Cc", "Date", "Message-ID"];

export type GmailHeaderMap = Record<string, string>;

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string;
  internalDate?: string;
  labelIds: string[];
  unread: boolean;
};

export type GmailAttachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type GmailMessage = GmailMessageSummary & {
  messageIdHeader?: string;
  references?: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: GmailAttachment[];
};

export type GmailLabel = {
  id: string;
  name: string;
  type: string;
  messagesUnread?: number;
};

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    throw new GmailApiError(
      data.error?.message || `Gmail API returned HTTP ${response.status}.`,
      response.status,
    );
  }

  const text = await response.text();

  return (text ? JSON.parse(text) : undefined) as T;
}

type RawHeader = { name: string; value: string };
type RawPart = {
  mimeType?: string;
  filename?: string;
  headers?: RawHeader[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: RawPart[];
};
type RawMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: RawPart;
};

function headersToMap(headers: RawHeader[] | undefined): GmailHeaderMap {
  const map: GmailHeaderMap = {};

  for (const header of headers ?? []) {
    map[header.name.toLowerCase()] = header.value;
  }

  return map;
}

export function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );
}

/** Enough to make an HTML-only email readable as text; not a full converter. */
export function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walkParts(
  part: RawPart | undefined,
  out: { text?: string; html?: string; attachments: GmailAttachment[] },
) {
  if (!part) {
    return;
  }

  const mimeType = part.mimeType ?? "";

  if (part.filename && part.body?.attachmentId) {
    out.attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType,
      size: part.body.size ?? 0,
    });
  } else if (part.body?.data) {
    if (mimeType === "text/plain" && out.text === undefined) {
      out.text = decodeBase64Url(part.body.data);
    } else if (mimeType === "text/html" && out.html === undefined) {
      out.html = decodeBase64Url(part.body.data);
    }
  }

  for (const child of part.parts ?? []) {
    walkParts(child, out);
  }
}

function toSummary(message: RawMessage): GmailMessageSummary {
  const headers = headersToMap(message.payload?.headers);
  const labelIds = message.labelIds ?? [];

  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet ?? "",
    subject: headers.subject ?? "",
    from: headers.from ?? "",
    to: headers.to ?? "",
    cc: headers.cc,
    date: headers.date ?? "",
    internalDate: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : undefined,
    labelIds,
    unread: labelIds.includes("UNREAD"),
  };
}

function toFullMessage(message: RawMessage): GmailMessage {
  const headers = headersToMap(message.payload?.headers);
  const bodies = { attachments: [] as GmailAttachment[] } as {
    text?: string;
    html?: string;
    attachments: GmailAttachment[];
  };

  walkParts(message.payload, bodies);

  return {
    ...toSummary(message),
    messageIdHeader: headers["message-id"],
    references: headers.references,
    bodyText: bodies.text ?? (bodies.html ? stripHtml(bodies.html) : undefined),
    bodyHtml: bodies.html,
    attachments: bodies.attachments,
  };
}

export async function getProfile(accessToken: string) {
  return gmailFetch<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
    historyId: string;
  }>(accessToken, "/profile");
}

export async function listMessages(
  accessToken: string,
  input: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  },
) {
  const params = new URLSearchParams();
  const maxResults = Math.min(Math.max(input.maxResults ?? 10, 1), MAX_LIST_RESULTS);
  params.set("maxResults", String(maxResults));

  if (input.query) params.set("q", input.query);
  if (input.pageToken) params.set("pageToken", input.pageToken);
  if (input.includeSpamTrash) params.set("includeSpamTrash", "true");
  for (const labelId of input.labelIds ?? []) params.append("labelIds", labelId);

  const list = await gmailFetch<{
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }>(accessToken, `/messages?${params}`);

  const ids = list.messages ?? [];
  const metadataQuery = new URLSearchParams({ format: "metadata" });
  for (const header of METADATA_HEADERS) metadataQuery.append("metadataHeaders", header);

  // The list call returns only ids; hydrate headers in parallel.
  const messages = await Promise.all(
    ids.map((entry) =>
      gmailFetch<RawMessage>(accessToken, `/messages/${entry.id}?${metadataQuery}`),
    ),
  );

  return {
    messages: messages
      .map(toSummary)
      .sort((a, b) => (b.internalDate ?? "").localeCompare(a.internalDate ?? "")),
    nextPageToken: list.nextPageToken,
    resultSizeEstimate: list.resultSizeEstimate ?? 0,
  };
}

export async function getMessage(accessToken: string, messageId: string) {
  const raw = await gmailFetch<RawMessage>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?format=full`,
  );

  return toFullMessage(raw);
}

export async function getThread(accessToken: string, threadId: string) {
  const raw = await gmailFetch<{ id: string; messages?: RawMessage[] }>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}?format=full`,
  );

  return {
    id: raw.id,
    messages: (raw.messages ?? []).map(toFullMessage),
  };
}

export async function listLabels(accessToken: string) {
  const data = await gmailFetch<{ labels?: GmailLabel[] }>(accessToken, "/labels");

  return (data.labels ?? []).map((label) => ({
    id: label.id,
    name: label.name,
    type: label.type,
    messagesUnread: label.messagesUnread,
  }));
}

export async function modifyMessage(
  accessToken: string,
  messageId: string,
  input: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  const raw = await gmailFetch<RawMessage>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}/modify`,
    {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: input.addLabelIds ?? [],
        removeLabelIds: input.removeLabelIds ?? [],
      }),
    },
  );

  return toSummary(raw);
}

export type OutgoingAttachment = { filename: string; mimeType: string; base64: string };

export type OutgoingMessage = {
  from: string;
  attachments?: OutgoingAttachment[];
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};

/** RFC 2047 encoding so non-ASCII subjects survive the MIME header. */
function encodeHeaderValue(value: string) {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function buildMimeMessage(message: OutgoingMessage) {
  const headers = [
    `From: ${message.from}`,
    `To: ${message.to.join(", ")}`,
    ...(message.cc?.length ? [`Cc: ${message.cc.join(", ")}`] : []),
    ...(message.bcc?.length ? [`Bcc: ${message.bcc.join(", ")}`] : []),
    `Subject: ${encodeHeaderValue(message.subject)}`,
    ...(message.inReplyTo ? [`In-Reply-To: ${message.inReplyTo}`] : []),
    ...(message.references ? [`References: ${message.references}`] : []),
    "MIME-Version: 1.0",
  ];
  const bodyType = `${message.isHtml ? "text/html" : "text/plain"}; charset="UTF-8"`;
  const bodyB64 = Buffer.from(message.body, "utf8").toString("base64");

  let lines: string[];

  if (message.attachments?.length) {
    const boundary = `mixed_${Date.now().toString(36)}`;
    lines = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: ${bodyType}`,
      "Content-Transfer-Encoding: base64",
      "",
      bodyB64,
      ...message.attachments.flatMap((attachment) => [
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        attachment.base64,
      ]),
      `--${boundary}--`,
    ];
  } else {
    lines = [...headers, `Content-Type: ${bodyType}`, "Content-Transfer-Encoding: base64", "", bodyB64];
  }

  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

export async function sendMessage(accessToken: string, message: OutgoingMessage) {
  const raw = await gmailFetch<RawMessage>(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify({
      raw: buildMimeMessage(message),
      ...(message.threadId ? { threadId: message.threadId } : {}),
    }),
  });

  return { id: raw.id, threadId: raw.threadId, labelIds: raw.labelIds ?? [] };
}

export async function createDraft(accessToken: string, message: OutgoingMessage) {
  const draft = await gmailFetch<{ id: string; message: RawMessage }>(
    accessToken,
    "/drafts",
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          raw: buildMimeMessage(message),
          ...(message.threadId ? { threadId: message.threadId } : {}),
        },
      }),
    },
  );

  return {
    draftId: draft.id,
    messageId: draft.message.id,
    threadId: draft.message.threadId,
  };
}

function extractAddresses(headerValue: string | undefined) {
  if (!headerValue) {
    return [] as string[];
  }

  return headerValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function addressOf(entry: string) {
  const match = entry.match(/<([^>]+)>/);
  return (match ? match[1] : entry).trim().toLowerCase();
}

/**
 * Derives the headers a reply needs from the message being answered: who to
 * address, the threaded subject, and the In-Reply-To/References chain that
 * keeps mail clients grouping it correctly.
 */
export function buildReplyHeaders(
  original: GmailMessage,
  selfEmail: string,
  replyAll: boolean,
) {
  const self = selfEmail.toLowerCase();
  const to = extractAddresses(original.from).filter(
    (entry) => addressOf(entry) !== self,
  );
  const cc = replyAll
    ? [...extractAddresses(original.to), ...extractAddresses(original.cc)].filter(
        (entry) => addressOf(entry) !== self && !to.some((t) => addressOf(t) === addressOf(entry)),
      )
    : [];
  const subject = /^re:/i.test(original.subject)
    ? original.subject
    : `Re: ${original.subject}`;
  const references = [original.references, original.messageIdHeader]
    .filter(Boolean)
    .join(" ");

  return {
    to: to.length > 0 ? to : extractAddresses(original.from),
    cc,
    subject,
    inReplyTo: original.messageIdHeader,
    references: references || undefined,
    threadId: original.threadId,
  };
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

type RawDraft = { id: string; message: RawMessage };

export async function listDrafts(
  accessToken: string,
  input: { query?: string; maxResults?: number; pageToken?: string },
) {
  const params = new URLSearchParams();
  params.set("maxResults", String(Math.min(Math.max(input.maxResults ?? 10, 1), MAX_LIST_RESULTS)));
  if (input.query) params.set("q", input.query);
  if (input.pageToken) params.set("pageToken", input.pageToken);

  const list = await gmailFetch<{ drafts?: { id: string }[]; nextPageToken?: string }>(
    accessToken,
    `/drafts?${params}`,
  );
  const metadataQuery = new URLSearchParams({ format: "metadata" });
  for (const header of METADATA_HEADERS) metadataQuery.append("metadataHeaders", header);

  const drafts = await Promise.all(
    (list.drafts ?? []).map((entry) =>
      gmailFetch<RawDraft>(accessToken, `/drafts/${entry.id}?${metadataQuery}`),
    ),
  );

  return {
    drafts: drafts.map((draft) => ({ draftId: draft.id, ...toSummary(draft.message) })),
    nextPageToken: list.nextPageToken,
  };
}

export async function getDraft(accessToken: string, draftId: string) {
  const draft = await gmailFetch<RawDraft>(
    accessToken,
    `/drafts/${encodeURIComponent(draftId)}?format=full`,
  );

  return { draftId: draft.id, message: toFullMessage(draft.message) };
}

/** Replaces the whole draft; Gmail has no partial draft update. */
export async function updateDraft(
  accessToken: string,
  draftId: string,
  message: OutgoingMessage,
) {
  const draft = await gmailFetch<RawDraft>(
    accessToken,
    `/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: {
          raw: buildMimeMessage(message),
          ...(message.threadId ? { threadId: message.threadId } : {}),
        },
      }),
    },
  );

  return { draftId: draft.id, messageId: draft.message.id, threadId: draft.message.threadId };
}

export async function sendDraft(accessToken: string, draftId: string) {
  const raw = await gmailFetch<RawMessage>(accessToken, "/drafts/send", {
    method: "POST",
    body: JSON.stringify({ id: draftId }),
  });

  return { id: raw.id, threadId: raw.threadId, labelIds: raw.labelIds ?? [] };
}

export async function deleteDraft(accessToken: string, draftId: string) {
  await gmailFetch<void>(accessToken, `/drafts/${encodeURIComponent(draftId)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Message and thread lifecycle
// ---------------------------------------------------------------------------

async function postAction(accessToken: string, path: string) {
  return gmailFetch<RawMessage>(accessToken, path, { method: "POST" });
}

export async function trashMessage(accessToken: string, id: string) {
  return toSummary(await postAction(accessToken, `/messages/${encodeURIComponent(id)}/trash`));
}

export async function untrashMessage(accessToken: string, id: string) {
  return toSummary(await postAction(accessToken, `/messages/${encodeURIComponent(id)}/untrash`));
}

/** Bypasses Trash entirely; there is no recovery. */
export async function deleteMessagePermanently(accessToken: string, id: string) {
  await gmailFetch<void>(accessToken, `/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function trashThread(accessToken: string, id: string) {
  await gmailFetch<unknown>(accessToken, `/threads/${encodeURIComponent(id)}/trash`, { method: "POST" });
}

export async function untrashThread(accessToken: string, id: string) {
  await gmailFetch<unknown>(accessToken, `/threads/${encodeURIComponent(id)}/untrash`, { method: "POST" });
}

export async function deleteThreadPermanently(accessToken: string, id: string) {
  await gmailFetch<void>(accessToken, `/threads/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function modifyThread(
  accessToken: string,
  threadId: string,
  input: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  const raw = await gmailFetch<{ id: string; messages?: RawMessage[] }>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}/modify`,
    {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: input.addLabelIds ?? [],
        removeLabelIds: input.removeLabelIds ?? [],
      }),
    },
  );

  return { id: raw.id, messages: (raw.messages ?? []).map(toSummary) };
}

export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
) {
  const data = await gmailFetch<{ size: number; data: string }>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );

  // Gmail returns base64url; standard base64 is what most consumers expect.
  return {
    size: data.size,
    base64: Buffer.from(data.data, "base64url").toString("base64"),
  };
}

export async function listHistory(
  accessToken: string,
  input: {
    startHistoryId: string;
    labelId?: string;
    historyTypes?: string[];
    maxResults?: number;
    pageToken?: string;
  },
) {
  const params = new URLSearchParams({ startHistoryId: input.startHistoryId });
  if (input.labelId) params.set("labelId", input.labelId);
  if (input.maxResults) params.set("maxResults", String(Math.min(input.maxResults, 500)));
  if (input.pageToken) params.set("pageToken", input.pageToken);
  for (const type of input.historyTypes ?? []) params.append("historyTypes", type);

  return gmailFetch<{
    history?: Record<string, unknown>[];
    nextPageToken?: string;
    historyId?: string;
  }>(accessToken, `/history?${params}`);
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export type LabelInput = {
  name?: string;
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
  color?: { textColor: string; backgroundColor: string };
};

export async function createLabel(accessToken: string, input: LabelInput & { name: string }) {
  return gmailFetch<GmailLabel>(accessToken, "/labels", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateLabel(accessToken: string, labelId: string, input: LabelInput) {
  return gmailFetch<GmailLabel>(accessToken, `/labels/${encodeURIComponent(labelId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteLabel(accessToken: string, labelId: string) {
  await gmailFetch<void>(accessToken, `/labels/${encodeURIComponent(labelId)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Settings (gmail.settings.basic / gmail.settings.sharing)
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function getSetting(accessToken: string, name: string) {
  return gmailFetch<Json>(accessToken, `/settings/${name}`);
}

function putSetting(accessToken: string, name: string, body: Json) {
  return gmailFetch<Json>(accessToken, `/settings/${name}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export const getVacationSettings = (t: string) => getSetting(t, "vacation");
export const updateVacationSettings = (t: string, b: Json) => putSetting(t, "vacation", b);
export const getLanguageSettings = (t: string) => getSetting(t, "language");
export const updateLanguageSettings = (t: string, b: Json) => putSetting(t, "language", b);
export const getImapSettings = (t: string) => getSetting(t, "imap");
export const updateImapSettings = (t: string, b: Json) => putSetting(t, "imap", b);
export const getPopSettings = (t: string) => getSetting(t, "pop");
export const updatePopSettings = (t: string, b: Json) => putSetting(t, "pop", b);
export const getAutoForwarding = (t: string) => getSetting(t, "autoForwarding");
export const updateAutoForwarding = (t: string, b: Json) => putSetting(t, "autoForwarding", b);

export async function listSendAs(accessToken: string) {
  const data = await gmailFetch<{ sendAs?: Json[] }>(accessToken, "/settings/sendAs");
  return data.sendAs ?? [];
}

export function getSendAs(accessToken: string, sendAsEmail: string) {
  return gmailFetch<Json>(accessToken, `/settings/sendAs/${encodeURIComponent(sendAsEmail)}`);
}

export function updateSendAs(accessToken: string, sendAsEmail: string, body: Json) {
  return gmailFetch<Json>(accessToken, `/settings/sendAs/${encodeURIComponent(sendAsEmail)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function listFilters(accessToken: string) {
  const data = await gmailFetch<{ filter?: Json[] }>(accessToken, "/settings/filters");
  return data.filter ?? [];
}

export function getFilter(accessToken: string, filterId: string) {
  return gmailFetch<Json>(accessToken, `/settings/filters/${encodeURIComponent(filterId)}`);
}

export function createFilter(accessToken: string, body: Json) {
  return gmailFetch<Json>(accessToken, "/settings/filters", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteFilter(accessToken: string, filterId: string) {
  await gmailFetch<void>(accessToken, `/settings/filters/${encodeURIComponent(filterId)}`, {
    method: "DELETE",
  });
}

export async function listForwardingAddresses(accessToken: string) {
  const data = await gmailFetch<{ forwardingAddresses?: Json[] }>(
    accessToken,
    "/settings/forwardingAddresses",
  );
  return data.forwardingAddresses ?? [];
}

// ---------------------------------------------------------------------------
// Push notifications (requires a Pub/Sub topic Gmail may publish to)
// ---------------------------------------------------------------------------

export function watchMailbox(
  accessToken: string,
  input: { topicName: string; labelIds?: string[]; labelFilterBehavior?: "include" | "exclude" },
) {
  return gmailFetch<{ historyId: string; expiration: string }>(accessToken, "/watch", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function stopWatch(accessToken: string) {
  await gmailFetch<void>(accessToken, "/stop", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Parity additions: batch ops, threads list, label detail, insert/import,
// forwarding, send-as lifecycle, forwarding addresses, S/MIME and CSE listings
// ---------------------------------------------------------------------------

export async function batchDeleteMessages(accessToken: string, ids: string[]) {
  await gmailFetch<void>(accessToken, "/messages/batchDelete", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function batchModifyMessages(
  accessToken: string,
  ids: string[],
  input: { addLabelIds?: string[]; removeLabelIds?: string[] },
) {
  await gmailFetch<void>(accessToken, "/messages/batchModify", {
    method: "POST",
    body: JSON.stringify({ ids, addLabelIds: input.addLabelIds ?? [], removeLabelIds: input.removeLabelIds ?? [] }),
  });
}

export async function getLabel(accessToken: string, labelId: string) {
  return gmailFetch<GmailLabel & { messagesTotal?: number; threadsTotal?: number; threadsUnread?: number }>(
    accessToken,
    `/labels/${encodeURIComponent(labelId)}`,
  );
}

export async function listThreads(
  accessToken: string,
  input: { query?: string; labelIds?: string[]; maxResults?: number; pageToken?: string; includeSpamTrash?: boolean },
) {
  const params = new URLSearchParams();
  params.set("maxResults", String(Math.min(Math.max(input.maxResults ?? 10, 1), MAX_LIST_RESULTS)));
  if (input.query) params.set("q", input.query);
  if (input.pageToken) params.set("pageToken", input.pageToken);
  if (input.includeSpamTrash) params.set("includeSpamTrash", "true");
  for (const labelId of input.labelIds ?? []) params.append("labelIds", labelId);

  const list = await gmailFetch<{ threads?: { id: string; snippet?: string }[]; nextPageToken?: string; resultSizeEstimate?: number }>(
    accessToken,
    `/threads?${params}`,
  );
  const metadataQuery = new URLSearchParams({ format: "metadata" });
  for (const header of METADATA_HEADERS) metadataQuery.append("metadataHeaders", header);

  const threads = await Promise.all(
    (list.threads ?? []).map(async (entry) => {
      const raw = await gmailFetch<{ id: string; messages?: RawMessage[] }>(accessToken, `/threads/${entry.id}?${metadataQuery}`);
      const messages = (raw.messages ?? []).map(toSummary);
      const latest = messages[messages.length - 1];
      return {
        id: raw.id,
        snippet: entry.snippet ?? "",
        messageCount: messages.length,
        subject: messages[0]?.subject ?? "",
        participants: Array.from(new Set(messages.map((m) => m.from))).slice(0, 10),
        lastMessageDate: latest?.internalDate,
        unread: messages.some((m) => m.unread),
        labelIds: Array.from(new Set(messages.flatMap((m) => m.labelIds))),
      };
    }),
  );

  return { threads, nextPageToken: list.nextPageToken, resultSizeEstimate: list.resultSizeEstimate ?? 0 };
}

/**
 * insert bypasses filters and spam classification and takes label ids;
 * import runs the message through delivery like received mail.
 */
export async function insertMessage(
  accessToken: string,
  input: { raw: string; mode: "insert" | "import"; labelIds?: string[]; neverMarkSpam?: boolean },
) {
  const path =
    input.mode === "import"
      ? `/messages/import${input.neverMarkSpam ? "?neverMarkSpam=true" : ""}`
      : "/messages/insert";
  const raw = await gmailFetch<RawMessage>(accessToken, path, {
    method: "POST",
    body: JSON.stringify({ raw: input.raw, ...(input.labelIds?.length ? { labelIds: input.labelIds } : {}) }),
  });
  return { id: raw.id, threadId: raw.threadId, labelIds: raw.labelIds ?? [] };
}

/** Builds a forward: quoted original text plus its attachments re-fetched and re-attached. */
export async function forwardMessage(
  accessToken: string,
  input: { from: string; messageId: string; to: string[]; cc?: string[]; bcc?: string[]; note?: string; includeAttachments?: boolean },
) {
  const original = await getMessage(accessToken, input.messageId);
  const attachments: OutgoingAttachment[] = [];

  if (input.includeAttachments !== false) {
    for (const attachment of original.attachments) {
      const data = await getAttachment(accessToken, input.messageId, attachment.attachmentId);
      attachments.push({ filename: attachment.filename, mimeType: attachment.mimeType, base64: data.base64 });
    }
  }

  const quoted = [
    input.note ?? "",
    "",
    "---------- Forwarded message ---------",
    `From: ${original.from}`,
    `Date: ${original.date}`,
    `Subject: ${original.subject}`,
    `To: ${original.to}`,
    ...(original.cc ? [`Cc: ${original.cc}`] : []),
    "",
    original.bodyText ?? "",
  ].join("\n");

  const sent = await sendMessage(accessToken, {
    from: input.from,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: /^fwd?:/i.test(original.subject) ? original.subject : `Fwd: ${original.subject}`,
    body: quoted,
    attachments,
  });

  return { forwarded: { messageId: original.id, subject: original.subject, attachments: attachments.length }, sent };
}

export function createSendAs(
  accessToken: string,
  body: { sendAsEmail: string; displayName?: string; replyToAddress?: string; treatAsAlias?: boolean },
) {
  return gmailFetch<Json>(accessToken, "/settings/sendAs", { method: "POST", body: JSON.stringify(body) });
}

export async function deleteSendAs(accessToken: string, sendAsEmail: string) {
  await gmailFetch<void>(accessToken, `/settings/sendAs/${encodeURIComponent(sendAsEmail)}`, { method: "DELETE" });
}

export async function verifySendAs(accessToken: string, sendAsEmail: string) {
  await gmailFetch<void>(accessToken, `/settings/sendAs/${encodeURIComponent(sendAsEmail)}/verify`, { method: "POST" });
}

export function createForwardingAddress(accessToken: string, forwardingEmail: string) {
  return gmailFetch<Json>(accessToken, "/settings/forwardingAddresses", { method: "POST", body: JSON.stringify({ forwardingEmail }) });
}

export async function deleteForwardingAddress(accessToken: string, forwardingEmail: string) {
  await gmailFetch<void>(accessToken, `/settings/forwardingAddresses/${encodeURIComponent(forwardingEmail)}`, { method: "DELETE" });
}

/** Workspace-only listings; consumer accounts return an error from Gmail. */
export async function listSmimeConfigs(accessToken: string, sendAsEmail: string) {
  const data = await gmailFetch<{ smimeInfo?: Json[] }>(accessToken, `/settings/sendAs/${encodeURIComponent(sendAsEmail)}/smimeInfo`);
  return data.smimeInfo ?? [];
}

export async function listCseIdentities(accessToken: string) {
  const data = await gmailFetch<{ cseIdentities?: Json[] }>(accessToken, "/settings/cse/identities");
  return data.cseIdentities ?? [];
}

export async function listCseKeyPairs(accessToken: string) {
  const data = await gmailFetch<{ cseKeyPairs?: Json[] }>(accessToken, "/settings/cse/keypairs");
  return data.cseKeyPairs ?? [];
}

// ---------------------------------------------------------------------------
// Sender resolution
// ---------------------------------------------------------------------------

type SendAsAlias = {
  sendAsEmail: string;
  displayName?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  verificationStatus?: string;
};

function formatSender(alias: SendAsAlias) {
  return alias.displayName ? `${alias.displayName} <${alias.sendAsEmail}>` : alias.sendAsEmail;
}

/**
 * Decides the From header for outgoing mail.
 *
 * With no request, the alias Gmail marks default wins (falling back to the
 * primary address), so a mailbox configured to send as pavel@relvema.com does
 * so without callers changing anything. A requested address must be a verified
 * send-as alias; Gmail rewrites or rejects anything else. When the alias
 * carries SMTP relay settings, Gmail routes the message through that relay.
 */
export async function resolveSender(accessToken: string, primaryEmail: string, requested?: string) {
  let aliases: SendAsAlias[] = [];

  try {
    aliases = (await listSendAs(accessToken)) as SendAsAlias[];
  } catch {
    aliases = [];
  }

  const verified = aliases.filter((alias) => alias.isPrimary || alias.verificationStatus === "accepted");

  if (requested) {
    const wanted = requested.trim().toLowerCase();

    if (wanted === primaryEmail.toLowerCase() && verified.length === 0) {
      return primaryEmail;
    }

    const match = verified.find((alias) => alias.sendAsEmail.toLowerCase() === wanted);

    if (!match) {
      const options = verified.map((alias) => alias.sendAsEmail).join(", ") || primaryEmail;
      throw new Error(
        `"${requested}" is not a verified send-as address on this mailbox. Verified senders: ${options}. Use list_send_as to inspect them.`,
      );
    }

    return formatSender(match);
  }

  const chosen = verified.find((alias) => alias.isDefault) ?? verified.find((alias) => alias.isPrimary);
  return chosen ? formatSender(chosen) : primaryEmail;
}
