import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/admin/dashboard-nav";
import { AdminThemeScript } from "@/components/admin/theme-script";
import { AdminThemeToggle } from "@/components/admin/theme-toggle";
import { LogoutButton } from "@/components/admin/logout-button";
import {
  adminBadgeClasses,
  adminShellClasses,
} from "@/components/admin/styles";
import { requireAdminSession } from "@/lib/firebase/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware already confines an un-enrolled session to the security page;
  // the layout only needs a valid session and shows a reminder until enrolled.
  const session = await requireAdminSession({ allowUnenrolled: true });

  return (
    <div className={adminShellClasses}>
      <AdminThemeScript />
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-6 2xl:px-8">
        <header className="border border-admin-border bg-admin-accent/[0.03] px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className={adminBadgeClasses}>Private Dashboard</span>
              <div>
                <h1 className="text-2xl tracking-tight">Portfolio Dashboard</h1>
                <p className="text-sm text-admin-muted">
                  Signed in as {session.email ?? "admin"}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AdminThemeToggle />
              <Link
                href="/"
                className="border border-admin-border px-4 py-2 text-sm text-admin-strong transition-colors hover:bg-admin-hover hover:text-admin-fg"
              >
                View site
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        {!session.mfaEnrolled ? (
          <div className="border border-admin-warning-border bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
            Two-factor authentication is not set up yet.{" "}
            <Link href="/dashboard/security?enroll=1" className="underline underline-offset-4">Finish setup</Link> to unlock the dashboard.
          </div>
        ) : null}

        <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <DashboardNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
