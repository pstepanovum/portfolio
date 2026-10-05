import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { totalAccounts, type OverviewAccount } from "../lib/connections/plaid-overview";

function account(type: string, current: number | null, available: number | null = null, currency: string | null = "USD"): OverviewAccount {
  return { type, current, available, currency };
}

describe("totalAccounts", () => {
  it("adds cash and subtracts what is owed", () => {
    const [usd] = totalAccounts([
      account("depository", 8390.17, 8390.17),
      account("depository", 6077.06, 5778.88),
      account("depository", 37679.68, 37679.68),
      account("credit", 975.36, 5024.64),
    ]);

    assert.equal(usd.currency, "USD");
    assert.equal(usd.cash, 52146.91);
    assert.equal(usd.availableCash, 51848.73);
    assert.equal(usd.creditOwed, 975.36);
    assert.equal(usd.net, 51171.55);
    assert.equal(usd.accountCount, 4);
  });

  it("does not count a card's available credit as cash", () => {
    const [usd] = totalAccounts([account("credit", 100, 5900)]);

    assert.equal(usd.cash, 0);
    assert.equal(usd.availableCash, 0);
    assert.equal(usd.net, -100);
  });

  it("counts investments and other as assets and loans as debt", () => {
    const [usd] = totalAccounts([
      account("investment", 1000),
      account("brokerage", 500),
      account("other", 20),
      account("loan", 300),
    ]);

    assert.equal(usd.investments, 1500);
    assert.equal(usd.other, 20);
    assert.equal(usd.loansOwed, 300);
    assert.equal(usd.net, 1220);
  });

  it("falls back to the current balance when available is missing", () => {
    const [usd] = totalAccounts([account("depository", 250, null)]);

    assert.equal(usd.availableCash, 250);
  });

  it("counts an account with no balance without adding anything", () => {
    const [usd] = totalAccounts([account("depository", null, null), account("depository", 10, 10)]);

    assert.equal(usd.accountCount, 2);
    assert.equal(usd.cash, 10);
  });

  it("keeps currencies apart", () => {
    const totals = totalAccounts([
      account("depository", 100, 100, "USD"),
      account("depository", 50, 50, "EUR"),
      account("depository", 5, 5, null),
    ]);

    assert.deepEqual(
      totals.map((t) => [t.currency, t.cash]),
      [["USD", 100], ["EUR", 50], ["unknown", 5]],
    );
  });

  it("rounds away floating-point dust", () => {
    const [usd] = totalAccounts([account("depository", 0.1), account("depository", 0.2)]);

    assert.equal(usd.cash, 0.3);
  });

  it("returns nothing for no accounts", () => {
    assert.deepEqual(totalAccounts([]), []);
  });
});
