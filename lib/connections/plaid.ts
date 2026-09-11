import "server-only";

const PLAID_HOSTS = {
  sandbox: "https://sandbox.plaid.com",
  production: "https://production.plaid.com",
} as const;

export type PlaidEnvironment = keyof typeof PLAID_HOSTS;

/**
 * Products this integration asks for, and deliberately no more.
 *
 * `auth` is omitted on purpose: it returns account and routing numbers, which
 * is the data that lets someone pull money by ACH. A dashboard that only reads
 * balances and history has no use for it, so not requesting it removes the
 * worst thing a leak of this database could expose.
 */
export const PLAID_PRODUCTS = ["transactions"] as const;

/** Asked for only when the connected institution can serve them. */
export const PLAID_OPTIONAL_PRODUCTS = ["investments", "liabilities"] as const;

export const PLAID_COUNTRY_CODES = ["US"] as const;

/**
 * Where a bank sends the browser back after OAuth sign-in. It must be listed
 * verbatim under "Allowed redirect URIs" in the Plaid dashboard, must be HTTPS
 * outside Sandbox, and cannot contain a fragment. It sits inside the dashboard
 * so the page is reached only with a live admin session; the session cookie is
 * SameSite=Lax, which survives the bank's top-level redirect.
 *
 * Declared here rather than in the page file because Next refuses to build a
 * route or page module that exports anything but its known handlers.
 */
export const PLAID_OAUTH_REDIRECT_PATH = "/dashboard/connections/plaid/oauth";

/** Where Plaid posts item updates. Public by necessity, verified on arrival. */
export const PLAID_WEBHOOK_PATH = "/api/plaid/webhook";

export class PlaidApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode: string,
    public readonly errorType: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "PlaidApiError";
  }

  /** The item needs the user to sign in again at the bank. */
  get requiresReconnect() {
    return (
      this.errorCode === "ITEM_LOGIN_REQUIRED" ||
      this.errorCode === "PENDING_EXPIRATION" ||
      this.errorCode === "PENDING_DISCONNECT" ||
      this.errorCode === "ACCESS_NOT_GRANTED"
    );
  }

  /** Plaid is still preparing data for a freshly linked item. */
  get isNotReady() {
    return this.errorCode === "PRODUCT_NOT_READY";
  }
}

type PlaidConfig = {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
  host: string;
};

function readEnvironment(): PlaidEnvironment {
  const raw = process.env.PLAID_ENV?.trim().toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

function getConfig(): PlaidConfig {
  const clientId = process.env.PLAID_CLIENT_ID?.trim();
  const secret = process.env.PLAID_SECRET?.trim();

  if (!clientId || !secret) {
    throw new Error(
      "PLAID_CLIENT_ID and PLAID_SECRET are not set. Copy them from the Plaid dashboard into .env.local.",
    );
  }

  const environment = readEnvironment();

  return { clientId, secret, environment, host: PLAID_HOSTS[environment] };
}

export function isPlaidConfigured() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/** Which Plaid environment this deployment talks to, for the dashboard banner. */
export function getPlaidEnvironment(): PlaidEnvironment {
  return readEnvironment();
}

type PlaidErrorBody = {
  error_type?: string;
  error_code?: string;
  error_message?: string;
  display_message?: string | null;
  request_id?: string;
};

/**
 * Plaid takes credentials in the JSON body rather than a header, and answers
 * errors with a structured body. No SDK is used, matching how the Gmail and
 * Workspace clients are written.
 */
export async function plaidFetch<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const config = getConfig();

  const response = await fetch(`${config.host}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, client_id: config.clientId, secret: config.secret }),
  });

  const text = await response.text();
  const data = (text ? JSON.parse(text) : {}) as T & PlaidErrorBody;

  if (!response.ok) {
    throw new PlaidApiError(
      data.display_message || data.error_message || `Plaid returned HTTP ${response.status}.`,
      response.status,
      data.error_code ?? "UNKNOWN",
      data.error_type ?? "UNKNOWN",
      data.request_id,
    );
  }

  return data;
}

export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balances: {
    available?: number | null;
    current?: number | null;
    limit?: number | null;
    iso_currency_code?: string | null;
    unofficial_currency_code?: string | null;
  };
};

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code?: string | null;
  date: string;
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  payment_channel?: string;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
  website?: string | null;
};

export type PlaidInstitution = {
  institution_id: string;
  name: string;
  url?: string | null;
  logo?: string | null;
  primary_color?: string | null;
};

/**
 * Creates the token that opens Link in the browser. `redirectUri` must exactly
 * match one of the allowed redirect URIs registered in the Plaid dashboard, and
 * is required for OAuth banks such as Chase and Bank of America.
 */
export async function createLinkToken(input: {
  userId: string;
  redirectUri?: string;
  webhookUrl?: string;
  /** Set to re-authenticate an existing item rather than link a new one. */
  accessToken?: string;
}) {
  const body: Record<string, unknown> = {
    user: { client_user_id: input.userId },
    client_name: "Pavel Stepanov Dashboard",
    language: "en",
    country_codes: PLAID_COUNTRY_CODES,
  };

  if (input.accessToken) {
    // Update mode: Plaid infers the products from the existing item, and
    // sending `products` alongside an access token is rejected.
    body.access_token = input.accessToken;
  } else {
    body.products = PLAID_PRODUCTS;
    body.optional_products = PLAID_OPTIONAL_PRODUCTS;
  }

  if (input.redirectUri) body.redirect_uri = input.redirectUri;
  if (input.webhookUrl) body.webhook = input.webhookUrl;

  return plaidFetch<{ link_token: string; expiration: string; request_id: string }>(
    "/link/token/create",
    body,
  );
}

export async function exchangePublicToken(publicToken: string) {
  return plaidFetch<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
    public_token: publicToken,
  });
}

export async function getItem(accessToken: string) {
  return plaidFetch<{
    item: {
      item_id: string;
      institution_id?: string | null;
      webhook?: string | null;
      consent_expiration_time?: string | null;
      products: string[];
      available_products: string[];
      error?: { error_code?: string; error_message?: string } | null;
    };
  }>("/item/get", { access_token: accessToken });
}

export async function removeItem(accessToken: string) {
  return plaidFetch<{ request_id: string }>("/item/remove", { access_token: accessToken });
}

export async function getInstitution(institutionId: string) {
  return plaidFetch<{ institution: PlaidInstitution }>("/institutions/get_by_id", {
    institution_id: institutionId,
    country_codes: PLAID_COUNTRY_CODES,
    options: { include_optional_metadata: true },
  });
}

export async function getAccounts(accessToken: string) {
  return plaidFetch<{ accounts: PlaidAccount[]; item: { item_id: string } }>("/accounts/get", {
    access_token: accessToken,
  });
}

/** Forces a balance refresh at the bank rather than serving Plaid's cache. */
export async function getBalances(accessToken: string, accountIds?: string[]) {
  return plaidFetch<{ accounts: PlaidAccount[] }>("/accounts/balance/get", {
    access_token: accessToken,
    ...(accountIds?.length ? { options: { account_ids: accountIds } } : {}),
  });
}

/**
 * Transactions for a date range, fetched live on every call.
 *
 * Deliberately not the cursor-based sync endpoint. Sync exists to mirror a
 * bank's history into your own store, and this dashboard keeps no financial
 * history at rest: the only thing Firestore holds is the encrypted access
 * token. Reading on demand costs a round trip and removes a database full of
 * transactions as something that could ever leak.
 */
export async function getTransactions(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
  accountIds?: string[];
  count?: number;
  offset?: number;
}) {
  return plaidFetch<{
    accounts: PlaidAccount[];
    transactions: PlaidTransaction[];
    total_transactions: number;
  }>("/transactions/get", {
    access_token: input.accessToken,
    start_date: input.startDate,
    end_date: input.endDate,
    options: {
      count: Math.min(Math.max(input.count ?? 100, 1), 500),
      offset: Math.max(input.offset ?? 0, 0),
      ...(input.accountIds?.length ? { account_ids: input.accountIds } : {}),
    },
  });
}

export async function getRecurringTransactions(accessToken: string) {
  return plaidFetch<{
    inflow_streams: unknown[];
    outflow_streams: unknown[];
    updated_datetime?: string;
  }>("/transactions/recurring/get", { access_token: accessToken });
}

export async function getHoldings(accessToken: string) {
  return plaidFetch<{ accounts: PlaidAccount[]; holdings: unknown[]; securities: unknown[] }>(
    "/investments/holdings/get",
    { access_token: accessToken },
  );
}

export async function getLiabilities(accessToken: string) {
  return plaidFetch<{ accounts: PlaidAccount[]; liabilities: Record<string, unknown> }>(
    "/liabilities/get",
    { access_token: accessToken },
  );
}
