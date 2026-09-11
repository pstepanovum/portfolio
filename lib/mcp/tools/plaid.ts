import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  PlaidApiError,
  getBalances,
  getHoldings,
  getLiabilities,
  getRecurringTransactions,
  getTransactions,
  type PlaidAccount,
  type PlaidTransaction,
} from "@/lib/connections/plaid";
import {
  PlaidItemResolutionError,
  getAccessTokenForItem,
  isFromAnotherEnvironment,
  listPlaidItems,
  markItemStatus,
  resolvePlaidItem,
  touchPlaidItem,
  type PlaidItem,
} from "@/lib/connections/plaid-store";
import { errorResult, jsonResult } from "@/lib/mcp/format";

/**
 * Every tool here is read-only, and there is deliberately no write counterpart.
 * Plaid can move money through its Transfer and Payment Initiation products;
 * this server never requests them, so no token it issues can be used to try.
 */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const bankField = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    "Which linked bank to read: its alias, institution name, or id. Optional when exactly one bank is linked; required otherwise. Call list_banks to see them.",
  );

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .optional();

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Defaults to the last 30 days, which is what most questions mean. */
function resolveRange(startDate?: string, endDate?: string) {
  const end = endDate ?? isoDate(new Date());
  const start = startDate ?? isoDate(new Date(Date.parse(end) - 30 * 24 * 60 * 60 * 1000));

  return { start, end };
}

function summarizeAccount(account: PlaidAccount) {
  return {
    accountId: account.account_id,
    name: account.official_name || account.name,
    mask: account.mask ?? undefined,
    type: account.type,
    subtype: account.subtype ?? undefined,
    available: account.balances.available ?? null,
    current: account.balances.current ?? null,
    limit: account.balances.limit ?? null,
    currency: account.balances.iso_currency_code ?? account.balances.unofficial_currency_code ?? null,
  };
}

/** Plaid reports spending as positive and money in as negative; say so plainly. */
function summarizeTransaction(transaction: PlaidTransaction) {
  return {
    transactionId: transaction.transaction_id,
    accountId: transaction.account_id,
    date: transaction.date,
    name: transaction.merchant_name || transaction.name,
    rawName: transaction.name,
    amount: transaction.amount,
    direction: transaction.amount >= 0 ? "outflow" : "inflow",
    currency: transaction.iso_currency_code ?? null,
    pending: transaction.pending,
    category: transaction.personal_finance_category?.detailed ?? null,
    channel: transaction.payment_channel ?? null,
  };
}

/**
 * Resolves which bank was meant, fetches a decrypted token, runs, and turns
 * failures into something a model can act on. A bank asking for a fresh
 * sign-in must read as "reconnect on the dashboard" rather than as a generic
 * API error, and it flips the stored status so the dashboard shows it too.
 */
async function withBank<T>(
  bankRef: string | undefined,
  run: (accessToken: string, item: PlaidItem) => Promise<T>,
) {
  let item: PlaidItem;

  try {
    item = await resolvePlaidItem(bankRef);
  } catch (error) {
    return errorResult(
      error instanceof PlaidItemResolutionError ? error.message : String(error),
    );
  }

  // Plaid would answer this with a bare "invalid access token", which reads
  // like a broken connection rather than a deployment that changed under it.
  if (isFromAnotherEnvironment(item)) {
    return errorResult(
      `${item.institutionName} was linked against Plaid's ${item.environment} environment and this deployment now uses another one. Unlink it and link it again at /dashboard/connections/plaid.`,
    );
  }

  try {
    const accessToken = await getAccessTokenForItem(item.id);
    const data = await run(accessToken, item);
    await touchPlaidItem(item.id);

    return jsonResult({ bank: item.alias, institution: item.institutionName, ...data });
  } catch (error) {
    if (error instanceof PlaidApiError) {
      if (error.requiresReconnect) {
        await markItemStatus(item.id, "reauth", error.message);

        return errorResult(
          `${item.institutionName} needs you to sign in again before it can be read. Reconnect it at /dashboard/connections/plaid.`,
        );
      }

      if (error.isNotReady) {
        return errorResult(
          `${item.institutionName} was linked recently and Plaid is still preparing its data. Try again in a minute.`,
        );
      }

      return errorResult(`Plaid error for ${item.institutionName}: ${error.message} (${error.errorCode})`);
    }

    return errorResult(error instanceof Error ? error.message : "The bank request failed.");
  }
}

export function registerPlaidReadTools(server: McpServer) {
  server.registerTool(
    "list_banks",
    {
      title: "List linked banks",
      description:
        "Every bank linked on the dashboard, with its alias and accounts. Call this first when more than one bank may be linked, then pass an alias as `bank` to the other tools.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      const items = await listPlaidItems();

      return jsonResult({
        banks: items.map((item) => ({
          bank: item.alias,
          institution: item.institutionName,
          status: item.status,
          needsSignIn: item.status === "reauth",
          wrongEnvironment: isFromAnotherEnvironment(item),
          consentExpiresAt: item.consentExpiresAt ?? null,
          accounts: item.accounts,
        })),
      });
    },
  );

  server.registerTool(
    "get_bank_balances",
    {
      title: "Get bank balances",
      description:
        "Current and available balances for a linked bank account, refreshed at the institution rather than served from cache. This is a bank, not a crypto exchange or a brokerage.",
      inputSchema: {
        bank: bankField,
        accountIds: z.array(z.string()).max(50).optional().describe("Limit to specific accounts."),
      },
      annotations: READ_ONLY,
    },
    async ({ bank, accountIds }) =>
      withBank(bank, async (accessToken) => {
        const { accounts } = await getBalances(accessToken, accountIds);
        return { accounts: accounts.map(summarizeAccount) };
      }),
  );

  server.registerTool(
    "list_bank_transactions",
    {
      title: "List bank transactions",
      description:
        "Bank account transactions in a date range, newest first. Defaults to the last 30 days. Amounts are positive for money leaving the account and negative for money arriving.",
      inputSchema: {
        bank: bankField,
        startDate: dateField.describe("YYYY-MM-DD. Defaults to 30 days before endDate."),
        endDate: dateField.describe("YYYY-MM-DD. Defaults to today."),
        accountIds: z.array(z.string()).max(50).optional(),
        count: z.number().int().min(1).max(500).optional().describe("Default 100."),
        offset: z.number().int().min(0).optional().describe("For paging past `count`."),
      },
      annotations: READ_ONLY,
    },
    async ({ bank, startDate, endDate, accountIds, count, offset }) =>
      withBank(bank, async (accessToken) => {
        const { start, end } = resolveRange(startDate, endDate);
        const response = await getTransactions({
          accessToken,
          startDate: start,
          endDate: end,
          accountIds,
          count,
          offset,
        });

        return {
          range: { startDate: start, endDate: end },
          total: response.total_transactions,
          returned: response.transactions.length,
          transactions: response.transactions.map(summarizeTransaction),
        };
      }),
  );

  server.registerTool(
    "search_bank_transactions",
    {
      title: "Search bank transactions",
      description:
        "Find bank account transactions whose merchant, description, or category matches a phrase, within a date range. Defaults to the last 90 days.",
      inputSchema: {
        query: z.string().trim().min(1).max(100).describe("Phrase to match, case-insensitive."),
        bank: bankField,
        startDate: dateField.describe("YYYY-MM-DD. Defaults to 90 days before endDate."),
        endDate: dateField.describe("YYYY-MM-DD. Defaults to today."),
        minAmount: z.number().optional().describe("Only transactions at or above this amount."),
        maxAmount: z.number().optional().describe("Only transactions at or below this amount."),
      },
      annotations: READ_ONLY,
    },
    async ({ query, bank, startDate, endDate, minAmount, maxAmount }) =>
      withBank(bank, async (accessToken) => {
        const end = endDate ?? isoDate(new Date());
        const start = startDate ?? isoDate(new Date(Date.parse(end) - 90 * 24 * 60 * 60 * 1000));
        const needle = query.toLowerCase();
        const matches: ReturnType<typeof summarizeTransaction>[] = [];

        // Plaid has no text filter on this endpoint, so pages are pulled and
        // matched here. Capped so a wide range cannot run forever.
        for (let offset = 0; offset < 2000; offset += 500) {
          const response = await getTransactions({
            accessToken,
            startDate: start,
            endDate: end,
            count: 500,
            offset,
          });

          response.transactions.forEach((transaction) => {
            const haystack = [
              transaction.name,
              transaction.merchant_name ?? "",
              transaction.personal_finance_category?.detailed ?? "",
            ]
              .join(" ")
              .toLowerCase();

            if (!haystack.includes(needle)) return;
            if (minAmount !== undefined && transaction.amount < minAmount) return;
            if (maxAmount !== undefined && transaction.amount > maxAmount) return;

            matches.push(summarizeTransaction(transaction));
          });

          if (offset + response.transactions.length >= response.total_transactions) break;
        }

        return {
          range: { startDate: start, endDate: end },
          query,
          matched: matches.length,
          transactions: matches,
        };
      }),
  );

  server.registerTool(
    "get_bank_recurring",
    {
      title: "Get recurring bank payments",
      description:
        "Subscriptions, bills, and other repeating payments detected in a linked bank account, both outgoing and incoming.",
      inputSchema: { bank: bankField },
      annotations: READ_ONLY,
    },
    async ({ bank }) =>
      withBank(bank, async (accessToken) => {
        const response = await getRecurringTransactions(accessToken);

        return {
          outflows: response.outflow_streams,
          inflows: response.inflow_streams,
          updatedAt: response.updated_datetime ?? null,
        };
      }),
  );

  server.registerTool(
    "get_bank_investments",
    {
      title: "Get bank investment holdings",
      description:
        "Securities held in investment accounts at a linked bank, with quantities and values. Only works for institutions that expose investments.",
      inputSchema: { bank: bankField },
      annotations: READ_ONLY,
    },
    async ({ bank }) =>
      withBank(bank, async (accessToken) => {
        const response = await getHoldings(accessToken);

        return {
          accounts: response.accounts.map(summarizeAccount),
          holdings: response.holdings,
          securities: response.securities,
        };
      }),
  );

  server.registerTool(
    "get_bank_liabilities",
    {
      title: "Get bank liabilities",
      description:
        "Credit card, student loan, and mortgage detail such as balances, APRs, minimum payments, and due dates.",
      inputSchema: { bank: bankField },
      annotations: READ_ONLY,
    },
    async ({ bank }) =>
      withBank(bank, async (accessToken) => {
        const response = await getLiabilities(accessToken);

        return {
          accounts: response.accounts.map(summarizeAccount),
          liabilities: response.liabilities,
        };
      }),
  );
}
