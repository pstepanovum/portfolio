"use client";

import { useState } from "react";
import {
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";
import { SCOPE_DESCRIPTIONS } from "@/lib/oauth/scope-descriptions";

export type ResourceChoice = {
  key: string;
  name: string;
  url: string;
  /** What the client asked for on this server, already narrowed to what it grants. */
  scopes: string[];
  /** Everything this server can grant, so the owner can widen the request. */
  available: string[];
  blurb: string;
};

type Props = {
  hidden: Record<string, string>;
  choices: ResourceChoice[];
  initialKey: string;
  /**
   * False only when the server could be neither read from the request nor
   * inferred from its scopes, which is the one case worth interrupting for.
   */
  resourceResolved: boolean;
};

/**
 * The consent form.
 *
 * Approving is one click. The server and the scopes are already resolved by
 * the time this renders, from what the client asked for, so the default path
 * is read the list and press the button. Everything adjustable is folded away
 * behind a toggle, because needing to change it is the rare case and making
 * every connection pay for that was worse than the problem it solved.
 */
export function AuthorizeForm({ hidden, choices, initialKey, resourceResolved }: Props) {
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const selected = choices.find((choice) => choice.key === selectedKey) ?? choices[0];

  // What the client asked for is the starting point, not the limit: the owner
  // of this server may hand it more or less. A client that asked for the wrong
  // scope would otherwise have to be rebuilt to ask again.
  const [granted, setGranted] = useState<string[]>(selected.scopes);
  // Opened by default only when the client left the server genuinely
  // ambiguous, since approving the wrong one is worse than an extra glance.
  const [customizing, setCustomizing] = useState(!resourceResolved && choices.length > 1);
  const grantsWrite = granted.some((scope) => scope.endsWith(":write"));

  const chooseResource = (key: string) => {
    const next = choices.find((choice) => choice.key === key) ?? choices[0];
    setSelectedKey(key);
    setGranted(next.scopes);
  };

  const toggle = (scope: string) => {
    setGranted((current) =>
      current.includes(scope) ? current.filter((value) => value !== scope) : [...current, scope],
    );
  };

  return (
    <form action="/api/oauth/authorize" method="POST" className="mt-8">
      {Object.entries(hidden).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
      <input type="hidden" name="resource" value={selected.url} />
      <input type="hidden" name="scope" value={granted.join(" ")} />

      {customizing && choices.length > 1 ? (
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
            Which server
          </div>
          <p className="mt-2 text-sm text-admin-muted">
            {resourceResolved
              ? "A token is bound to one server and is refused by the others."
              : "This app did not say which server it wants. Pick the one you meant. A token is bound to a single server and is refused by the others."}
          </p>
          <div className="mt-3 space-y-2">
            {choices.map((choice) => (
              <label
                key={choice.key}
                className={`flex cursor-pointer gap-3 border px-4 py-3 transition-colors ${
                  choice.key === selectedKey
                    ? "border-admin-accent bg-admin-hover-strong"
                    : "border-admin-border bg-admin-inset hover:bg-admin-hover"
                }`}
              >
                <input
                  type="radio"
                  name="resource-choice"
                  className="mt-1"
                  checked={choice.key === selectedKey}
                  onChange={() => chooseResource(choice.key)}
                />
                <span className="min-w-0">
                  <span className="block text-sm text-admin-fg">{choice.name}</span>
                  <span className="block text-xs text-admin-subtle">{choice.blurb}</span>
                  <span className="mt-1 block break-all font-mono text-[11px] text-admin-subtle">
                    {choice.url}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
          It will be able to
        </div>
        {customizing ? (
          <p className="text-sm text-admin-muted">
            Ticked permissions are what this app asked for. Add or remove any of them; the app
            receives exactly what you approve here.
          </p>
        ) : null}
        <ul className="space-y-2">
          {(customizing ? selected.available : granted).map((scope) => {
            const asked = selected.scopes.includes(scope);
            const on = granted.includes(scope);

            if (!customizing) {
              return (
                <li
                  key={scope}
                  className="border border-admin-border bg-admin-accent/[0.03] px-4 py-3 text-sm text-admin-strong"
                >
                  <div className="font-mono text-xs text-admin-subtle">{scope}</div>
                  <div className="mt-1">{SCOPE_DESCRIPTIONS[scope] ?? "Unrecognised permission."}</div>
                </li>
              );
            }

            return (
              <li key={scope}>
                <label
                  className={`flex cursor-pointer gap-3 border px-4 py-3 text-sm transition-colors ${
                    on
                      ? "border-admin-accent bg-admin-accent/[0.05] text-admin-strong"
                      : "border-admin-border bg-admin-inset text-admin-muted hover:bg-admin-hover"
                  }`}
                >
                  <input type="checkbox" className="mt-1" checked={on} onChange={() => toggle(scope)} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-admin-subtle">{scope}</span>
                      {asked ? (
                        <span className="border border-admin-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-admin-subtle">
                          Requested
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block">
                      {SCOPE_DESCRIPTIONS[scope] ?? "Unrecognised permission."}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {granted.length === 0 ? (
          <p className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
            Nothing is selected, so this app would connect with no access at all.
          </p>
        ) : null}

        {grantsWrite ? (
          <p className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
            {selected.key === "apps"
              ? "Write access lets this client send email as you. Only approve clients you trust."
              : "Write access lets this client change what appears on your public site. Only approve clients you trust."}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setCustomizing((value) => !value)}
        className="mt-4 text-sm text-admin-muted underline-offset-4 hover:text-admin-fg hover:underline"
      >
        {customizing ? "Hide options" : "Change what it can access"}
      </button>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="submit"
          name="decision"
          value="allow"
          disabled={granted.length === 0}
          className={`${adminPrimaryButtonClasses} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Approve access
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className={`${adminSecondaryButtonClasses} flex-1`}
        >
          Deny
        </button>
      </div>
    </form>
  );
}
