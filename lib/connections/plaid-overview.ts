/**
 * Totals across every linked bank, kept pure so it can be tested without
 * Plaid. An agent asked "how much cash do I have" should not have to add up
 * five accounts across two banks itself; models get that arithmetic wrong.
 *
 * Plaid reports every balance as a positive number, including what is owed on
 * a credit card or a loan, so the sign comes from the account type here.
 */

export type OverviewAccount = {
  type: string;
  available: number | null;
  current: number | null;
  currency: string | null;
};

export type CurrencyTotals = {
  currency: string;
  /** Checking, savings, CDs, money market: the current balance. */
  cash: number;
  /** Cash that can be spent right now, which excludes pending debits. */
  availableCash: number;
  investments: number;
  /** Owed on credit cards. */
  creditOwed: number;
  /** Owed on loans: student, auto, mortgage. */
  loansOwed: number;
  /** Anything Plaid types as `other`, counted as an asset. */
  other: number;
  /** cash + investments + other - creditOwed - loansOwed */
  net: number;
  accountCount: number;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyTotals(currency: string): CurrencyTotals {
  return {
    currency,
    cash: 0,
    availableCash: 0,
    investments: 0,
    creditOwed: 0,
    loansOwed: 0,
    other: 0,
    net: 0,
    accountCount: 0,
  };
}

/**
 * One set of totals per currency, since adding dollars to euros gives a
 * number that means nothing. An account with no balance at all is counted
 * but adds nothing.
 */
export function totalAccounts(accounts: OverviewAccount[]): CurrencyTotals[] {
  const byCurrency = new Map<string, CurrencyTotals>();

  for (const account of accounts) {
    const currency = account.currency ?? "unknown";
    const totals = byCurrency.get(currency) ?? emptyTotals(currency);
    byCurrency.set(currency, totals);
    totals.accountCount += 1;

    const current = account.current ?? 0;

    switch (account.type) {
      case "depository":
        totals.cash += current;
        totals.availableCash += account.available ?? current;
        break;
      case "investment":
      case "brokerage":
        totals.investments += current;
        break;
      case "credit":
        totals.creditOwed += current;
        break;
      case "loan":
        totals.loansOwed += current;
        break;
      default:
        totals.other += current;
    }
  }

  return [...byCurrency.values()].map((totals) => ({
    ...totals,
    cash: round(totals.cash),
    availableCash: round(totals.availableCash),
    investments: round(totals.investments),
    creditOwed: round(totals.creditOwed),
    loansOwed: round(totals.loansOwed),
    other: round(totals.other),
    net: round(totals.cash + totals.investments + totals.other - totals.creditOwed - totals.loansOwed),
  }));
}
