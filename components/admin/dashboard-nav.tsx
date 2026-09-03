"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminBadgeClasses,
  adminPanelClasses,
} from "@/components/admin/styles";

const navigationItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/certifications", label: "Certifications" },
  { href: "/dashboard/experience", label: "Timeline" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/connections", label: "Apps" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <aside className={`${adminPanelClasses} h-full`}>
      <div className="border-b border-admin-border p-6">
        <span className={adminBadgeClasses}>Private Admin</span>
        <h2 className="mt-4 text-xl">Portfolio Dashboard</h2>
        <p className="mt-2 max-w-xs text-sm text-admin-muted">
          Manage the content powering your public portfolio without changing the
          site copy by hand.
        </p>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {navigationItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`border px-4 py-3 text-sm transition-colors ${
                active
                  ? "border-admin-accent bg-admin-accent text-admin-accent-fg"
                  : "border-transparent text-admin-strong hover:border-admin-border hover:bg-admin-hover hover:text-admin-fg"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
