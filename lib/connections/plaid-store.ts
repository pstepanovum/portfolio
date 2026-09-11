import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";
import {
  getPlaidEnvironment,
  removeItem,
  type PlaidAccount,
  type PlaidEnvironment,
} from "@/lib/connections/plaid";

const COLLECTION = "plaidItems";
const ALIAS_PATTERN = /^[\w][\w .-]{0,39}$/;

export class PlaidItemResolutionError extends Error {
  constructor(
    message: string,
    public readonly kind: "none" | "ambiguous" | "unknown",
  ) {
    super(message);
    this.name = "PlaidItemResolutionError";
  }
}

/** reauth: the bank wants the user to sign in again; error: Plaid rejected the item. */
export type PlaidItemStatus = "active" | "reauth" | "error";

/** Account summary kept on the item so the dashboard needs no Plaid call to render. */
export type PlaidAccountSummary = {
  accountId: string;
  name: string;
  mask?: string;
  type: string;
  subtype?: string;
};

/**
 * Safe projection of a linked bank. The Plaid access token never appears here,
 * so nothing that reaches a page or a tool can carry the credential.
 */
export type PlaidItem = {
  id: string;
  itemId: string;
  /**
   * Which Plaid environment issued this item's access token. Tokens do not
   * cross environments, so after a switch to production every sandbox item
   * stops resolving; recording this is what lets the failure say so.
   */
  environment?: PlaidEnvironment;
  institutionId?: string;
  institutionName: string;
  alias: string;
  accounts: PlaidAccountSummary[];
  status: PlaidItemStatus;
  /** Bank-imposed consent expiry; Bank of America uses 12 months. */
  consentExpiresAt?: string;
  lastError?: string;
  lastUsedAt?: string;
  connectedAt?: string;
  updatedAt?: string;
};

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

export function summarizeAccounts(accounts: PlaidAccount[]): PlaidAccountSummary[] {
  return accounts.map((account) => ({
    accountId: account.account_id,
    name: account.official_name || account.name,
    mask: account.mask ?? undefined,
    type: account.type,
    subtype: account.subtype ?? undefined,
  }));
}

function normalize(id: string, data: Record<string, unknown>): PlaidItem {
  const accounts = Array.isArray(data.accounts) ? (data.accounts as PlaidAccountSummary[]) : [];
  const status = data.status;

  return {
    id,
    itemId: cleanString(data.itemId) ?? "",
    environment: data.environment === "production" || data.environment === "sandbox" ? data.environment : undefined,
    institutionId: cleanString(data.institutionId),
    institutionName: cleanString(data.institutionName) ?? "Bank",
    alias: cleanString(data.alias) ?? "",
    accounts,
    status: status === "reauth" || status === "error" ? status : "active",
    consentExpiresAt: toIso(data.consentExpiresAt) ?? cleanString(data.consentExpiresAt),
    lastError: cleanString(data.lastError),
    lastUsedAt: toIso(data.lastUsedAt),
    connectedAt: toIso(data.connectedAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function validateAlias(alias: string) {
  const trimmed = alias.trim();

  if (!ALIAS_PATTERN.test(trimmed)) {
    throw new Error(
      "Alias must be 1-40 characters: letters, numbers, spaces, dots, dashes, or underscores.",
    );
  }

  return trimmed;
}

/** "Chase Bank" becomes "chase"; collisions get a numeric suffix. */
function defaultAlias(institutionName: string) {
  const base =
    institutionName
      .toLowerCase()
      .replace(/\b(bank|of|the|na|n\.a\.|inc)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")[0] || "bank";

  return base.slice(0, 24);
}

export async function listPlaidItems() {
  const snapshot = await adminDb.collection(COLLECTION).orderBy("connectedAt", "asc").get();
  return snapshot.docs.map((doc) => normalize(doc.id, doc.data() as Record<string, unknown>));
}

export async function getPlaidItem(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
  return snapshot.exists ? normalize(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

async function findByItemId(itemId: string) {
  const snapshot = await adminDb.collection(COLLECTION).where("itemId", "==", itemId).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function uniqueAlias(preferred: string, exceptId?: string) {
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? preferred : `${preferred}${suffix + 1}`;
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("aliasLower", "==", candidate.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty || snapshot.docs[0].id === exceptId) {
      return candidate;
    }
  }

  return `${preferred}-${Date.now().toString(36)}`;
}

/**
 * Stores a freshly linked bank, or refreshes an existing one after a
 * re-authentication. Relinking the same item never creates a second record, so
 * the alias and history survive a bank's consent expiry.
 */
export async function upsertPlaidItem(input: {
  accessToken: string;
  itemId: string;
  institutionId?: string;
  institutionName: string;
  accounts: PlaidAccount[];
  consentExpiresAt?: string;
}) {
  const existing = await findByItemId(input.itemId);
  const accounts = summarizeAccounts(input.accounts);

  const shared = {
    itemId: input.itemId,
    institutionId: input.institutionId ?? null,
    institutionName: input.institutionName,
    accounts,
    accessToken: encryptSecret(input.accessToken),
    environment: getPlaidEnvironment(),
    status: "active" as const,
    consentExpiresAt: input.consentExpiresAt ?? null,
    lastError: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing) {
    await existing.ref.update(shared);
    return normalize(existing.id, (await existing.ref.get()).data() as Record<string, unknown>);
  }

  const alias = await uniqueAlias(defaultAlias(input.institutionName));
  const docRef = adminDb.collection(COLLECTION).doc();

  await docRef.set({
    ...shared,
    lastError: null,
    alias,
    aliasLower: alias.toLowerCase(),
    connectedAt: FieldValue.serverTimestamp(),
  });

  return normalize(docRef.id, (await docRef.get()).data() as Record<string, unknown>);
}

export async function updatePlaidItemAlias(id: string, alias: string) {
  const validated = validateAlias(alias);
  const unique = await uniqueAlias(validated, id);

  if (unique !== validated) {
    throw new Error(`The alias "${validated}" is already used by another bank.`);
  }

  await adminDb.collection(COLLECTION).doc(id).update({
    alias: validated,
    aliasLower: validated.toLowerCase(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getPlaidItem(id);
}

/**
 * Removes the item at Plaid before deleting the record, so the bank's consent
 * is actually withdrawn rather than merely forgotten here. A Plaid-side failure
 * does not block the local delete: leaving an orphan record would be worse.
 */
export async function deletePlaidItem(id: string) {
  const accessToken = await readAccessToken(id).catch(() => undefined);

  if (accessToken) {
    await removeItem(accessToken).catch(() => undefined);
  }

  await adminDb.collection(COLLECTION).doc(id).delete();
}

async function readAccessToken(id: string) {
  const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
  const stored = (snapshot.data() as Record<string, unknown> | undefined)?.accessToken;

  if (typeof stored !== "string" || !stored) {
    throw new Error("This bank has no stored credential; reconnect it on the dashboard.");
  }

  return decryptSecret(stored);
}

export async function getAccessTokenForItem(id: string) {
  return readAccessToken(id);
}

/**
 * True when this item was linked against a different Plaid environment than
 * the one now configured, which means its token cannot work and relinking is
 * the only fix.
 */
export function isFromAnotherEnvironment(item: PlaidItem) {
  return Boolean(item.environment) && item.environment !== getPlaidEnvironment();
}

/** Records that a tool read this bank, for the dashboard's "last used" line. */
export async function touchPlaidItem(id: string) {
  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({ lastUsedAt: FieldValue.serverTimestamp() })
    .catch(() => undefined);
}

export async function markItemStatus(id: string, status: PlaidItemStatus, reason?: string) {
  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({
      status,
      lastError: reason ?? FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    .catch(() => undefined);
}

export async function markItemByPlaidId(itemId: string, status: PlaidItemStatus, reason?: string) {
  const existing = await findByItemId(itemId);

  if (existing) {
    await markItemStatus(existing.id, status, reason);
  }

  return existing?.id;
}

/**
 * Resolves the bank a tool meant. With exactly one linked bank the parameter is
 * optional; beyond that it must name one, so a query can never silently read
 * the wrong account.
 */
export async function resolvePlaidItem(reference?: string | null) {
  const items = await listPlaidItems();

  if (items.length === 0) {
    throw new PlaidItemResolutionError(
      "No bank is linked yet. Link one at /dashboard/connections/plaid.",
      "none",
    );
  }

  const trimmed = reference?.trim();

  if (!trimmed) {
    if (items.length === 1) {
      return items[0];
    }

    throw new PlaidItemResolutionError(
      `Several banks are linked (${items.map((item) => item.alias).join(", ")}). Pass one as "bank".`,
      "ambiguous",
    );
  }

  const needle = trimmed.toLowerCase();
  const match =
    items.find((item) => item.id === trimmed) ??
    items.find((item) => item.alias.toLowerCase() === needle) ??
    items.find((item) => item.institutionName.toLowerCase() === needle) ??
    items.find((item) => item.institutionName.toLowerCase().includes(needle));

  if (!match) {
    throw new PlaidItemResolutionError(
      `No linked bank matches "${trimmed}". Linked: ${items.map((item) => item.alias).join(", ")}.`,
      "unknown",
    );
  }

  return match;
}
