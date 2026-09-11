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
  /** Scopes this client would receive on this server, already narrowed. */
  scopes: string[];
  blurb: string;
};

type Props = {
  hidden: Record<string, string>;
  choices: ResourceChoice[];
  initialKey: string;
  /**
   * True when the client named a resource itself (RFC 8707). The choice is
   * then fixed and only shown for confirmation.
   */
  clientChoseResource: boolean;
};

/**
 * The consent form.
 *
 * A client that follows RFC 8707 names the server it wants and there is
 * nothing to choose. A client that does not would otherwise fall through to
 * the default server and receive a token that fails everywhere else with a
 * confusing audience error, so the choice is surfaced here instead of guessed.
 */
export function AuthorizeForm({ hidden, choices, initialKey, clientChoseResource }: Props) {
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const selected = choices.find((choice) => choice.key === selectedKey) ?? choices[0];
  const grantsWrite = selected.scopes.some((scope) => scope.endsWith(":write"));

  return (
    <form action="/api/oauth/authorize" method="POST" className="mt-8">
      {Object.entries(hidden).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
      <input type="hidden" name="resource" value={selected.url} />
      <input type="hidden" name="scope" value={selected.scopes.join(" ")} />

      {!clientChoseResource && choices.length > 1 ? (
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
            Which server
          </div>
          <p className="mt-2 text-sm text-admin-muted">
            This app did not say which server it wants. Pick the one you meant. A token is
            bound to a single server and is refused by the others.
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
                  onChange={() => setSelectedKey(choice.key)}
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
        <ul className="space-y-3">
          {selected.scopes.map((scope) => (
            <li
              key={scope}
              className="border border-admin-border bg-admin-accent/[0.03] px-4 py-3 text-sm text-admin-strong"
            >
              <div className="font-mono text-xs text-admin-subtle">{scope}</div>
              <div className="mt-1">{SCOPE_DESCRIPTIONS[scope] ?? "Unrecognised permission."}</div>
            </li>
          ))}
        </ul>

        {grantsWrite ? (
          <p className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
            {selected.key === "apps"
              ? "Write access lets this client send email as you. Only approve clients you trust."
              : "Write access lets this client change what appears on your public site. Only approve clients you trust."}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="submit"
          name="decision"
          value="allow"
          className={`${adminPrimaryButtonClasses} flex-1`}
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
