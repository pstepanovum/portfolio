"use client";

import { useMemo, useState } from "react";
import { adminInputClasses, adminPanelClasses } from "@/components/admin/styles";

export type ToolRow = {
  name: string;
  title: string;
  description: string;
  badge?: string;
  destructive?: boolean;
};

export function ToolsList({ tools, heading = "Available tools" }: { tools: ToolRow[]; heading?: string }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tools;
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(needle) ||
        tool.title.toLowerCase().includes(needle) ||
        tool.description.toLowerCase().includes(needle),
    );
  }, [tools, query]);

  return (
    <section className={`${adminPanelClasses} p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl">
          {heading} <span className="text-admin-subtle">({tools.length})</span>
        </h3>
        <input
          className={`${adminInputClasses} sm:max-w-xs`}
          placeholder="Search tools..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ul className="mt-5 divide-y divide-admin-border">
        {visible.map((tool) => (
          <li key={tool.name} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-admin-fg">{tool.title}</span>
              <code className="text-xs text-admin-subtle">{tool.name}</code>
              {tool.badge ? (
                <span className="border border-admin-border px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-muted">
                  {tool.badge}
                </span>
              ) : null}
              {tool.destructive ? (
                <span className="border border-admin-danger-border bg-admin-danger-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-admin-danger-fg">
                  destructive
                </span>
              ) : null}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-admin-muted">{tool.description}</p>
          </li>
        ))}
        {visible.length === 0 ? <li className="py-4 text-admin-muted">No tools match.</li> : null}
      </ul>
    </section>
  );
}
