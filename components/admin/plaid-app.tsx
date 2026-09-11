"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/admin/google-app-icon";
import { usePlaidLink } from "@/components/admin/plaid-link";
import {
  adminDangerButtonClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
} from "@/components/admin/styles";
import { formatRelative } from "@/components/admin/time";
import { ToolsList } from "@/components/admin/tools-list";
import type { PlaidItem } from "@/lib/connections/plaid-store";
import type { PlaidEnvironment } from "@/lib/connections/plaid";
import type { ToolRow } from "@/components/admin/tools-list";

type Props = {
  items: PlaidItem[];
  tools: ToolRow[];
  environment: PlaidEnvironment;
  configured: boolean;
  initialNotice?: string | null;
};

function statusLabel(item: PlaidItem) {
  if (item.status === "reauth") return "Needs sign-in";
  if (item.status === "error") return "Error";
  return "Connected";
}

function statusClass(item: PlaidItem) {
  if (item.status === "reauth") return "text-admin-warning-fg";
  if (item.status === "error") return "text-admin-danger-fg";
  return "text-[#16a34a]";
}

function BankCard({
  item,
  onReconnect,
  onRemoved,
  busy,
}: {
  item: PlaidItem;
  onReconnect: (id: string) => void;
  onRemoved: () => void;
  busy: boolean;
}) {
  const [working, setWorking] = useState(false);

  const remove = async () => {
    const confirmed = window.confirm(
      `Unlink ${item.institutionName}? This withdraws consent at the bank and removes its accounts from the finance server.`,
    );

    if (!confirmed) return;

    setWorking(true);
    await fetch(`/api/admin/plaid/items/${item.id}`, { method: "DELETE" });
    setWorking(false);
    onRemoved();
  };

  return (
    <div className={`${adminPanelClasses} flex flex-col gap-4 p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-admin-fg">{item.institutionName}</span>
            <span className="border border-admin-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-admin-muted">
              {item.alias}
            </span>
          </div>
          <p className="mt-1 text-xs text-admin-subtle">
            <span className={statusClass(item)}>{statusLabel(item)}</span>
            {item.lastUsedAt ? ` · read ${formatRelative(item.lastUsedAt)}` : ""}
            {item.consentExpiresAt
              ? ` · consent expires ${new Date(item.consentExpiresAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {item.status === "active" ? null : (
            <button
              type="button"
              className={adminPrimaryButtonClasses}
              onClick={() => onReconnect(item.id)}
              disabled={busy || working}
            >
              Sign in again
            </button>
          )}
          <button
            type="button"
            className={adminDangerButtonClasses}
            onClick={remove}
            disabled={busy || working}
          >
            {working ? "Removing..." : "Unlink"}
          </button>
        </div>
      </div>

      {item.lastError ? (
        <div className="border border-admin-danger-border bg-admin-danger-bg px-3 py-2 text-xs text-admin-danger-fg">
          {item.lastError}
        </div>
      ) : null}

      <ul className="divide-y divide-admin-border border-t border-admin-border">
        {item.accounts.map((account) => (
          <li key={account.accountId} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="min-w-0 truncate text-admin-strong">
              {account.name}
              {account.mask ? <span className="text-admin-subtle"> ••{account.mask}</span> : null}
            </span>
            <span className="shrink-0 text-xs uppercase tracking-wide text-admin-subtle">
              {account.subtype || account.type}
            </span>
          </li>
        ))}
        {item.accounts.length === 0 ? (
          <li className="py-2 text-sm text-admin-muted">No accounts reported.</li>
        ) : null}
      </ul>
    </div>
  );
}

export function PlaidApp({ items, tools, environment, configured, initialNotice }: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);

  const refresh = useCallback(() => {
    setNotice("Bank linked.");
    router.refresh();
  }, [router]);

  const { open, busy, error } = usePlaidLink(refresh);

  const removed = () => {
    setNotice("Bank unlinked.");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-admin-subtle">
        <Link href="/dashboard/connections" className="hover:text-admin-fg">
          All Apps
        </Link>
        <span className="mx-2">/</span>
        <span className="text-admin-fg">Banks</span>
      </nav>

      <section
        className={`${adminPanelClasses} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center border border-admin-border bg-admin-inset">
            <AppLogo slug="plaid" url="https://plaid.com" className="h-8 w-8" />
          </span>
          <div>
            <h2 className="text-3xl tracking-tight">Banks</h2>
            <p className="text-sm text-admin-muted">
              Balances and transaction history through Plaid. Read-only.
            </p>
            <p className="text-xs text-admin-subtle">
              {items.length} linked ·{" "}
              <span className={environment === "production" ? "text-[#16a34a]" : "text-admin-warning-fg"}>
                {environment}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          className={adminPrimaryButtonClasses}
          onClick={() => open()}
          disabled={busy || !configured}
        >
          {busy ? "Opening..." : "Link a bank"}
        </button>
      </section>

      {!configured ? (
        <div className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
          Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET, and PLAID_ENV when moving
          to production.
        </div>
      ) : null}

      {environment === "sandbox" && configured ? (
        <div className="border border-admin-border bg-admin-inset px-4 py-3 text-sm text-admin-muted">
          Sandbox mode. Link any institution with username <code className="text-admin-fg">user_good</code>{" "}
          and password <code className="text-admin-fg">pass_good</code>. Balances and transactions are
          simulated.
        </div>
      ) : null}

      {notice ? (
        <div className="border border-admin-border bg-admin-inset px-4 py-3 text-sm text-admin-strong">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <BankCard key={item.id} item={item} onReconnect={open} onRemoved={removed} busy={busy} />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-admin-muted">
          No banks linked yet. Link one to expose its balances and transactions on the finance MCP
          server.
        </p>
      ) : null}

      <ToolsList tools={tools} />
    </div>
  );
}
