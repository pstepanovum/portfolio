import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/admin/dashboard-nav";
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
  const session = await requireAdminSession();

  return (
    <div className={adminShellClasses}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-6 2xl:px-8">
        <header className="border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className={adminBadgeClasses}>Private Dashboard</span>
              <div>
                <h1 className="text-2xl tracking-tight">Portfolio Dashboard</h1>
                <p className="text-sm text-white/60">
                  Signed in as {session.email ?? "admin"}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                View site
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <DashboardNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
