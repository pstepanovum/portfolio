import Image from "next/image";
import Link from "next/link";
import { adminBadgeClasses, adminLinkClasses, adminPanelClasses } from "@/components/admin/styles";
import { isAppAdminConfigured, listFriendCodes } from "@/lib/apps/codes-client";
import { MANAGED_APPS } from "@/lib/apps/registry";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardManagedAppsPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response.
  await requireAdminSession();

  const summaries = await Promise.all(
    MANAGED_APPS.map(async (app) => {
      if (!isAppAdminConfigured(app)) return { app, status: "Not configured" };
      try {
        const codes = await listFriendCodes(app);
        const active = codes.filter((code) => !code.disabled).length;
        const redeemed = codes.reduce((sum, code) => sum + code.redemptionList.filter((entry) => !entry.revokedAt).length, 0);
        return { app, status: `${active} active code${active === 1 ? "" : "s"} · ${redeemed} redeemed` };
      } catch {
        return { app, status: "Unreachable" };
      }
    }),
  );

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Apps</span>
        <h2 className="mt-4 text-2xl">Mobile apps</h2>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          Friend codes give complimentary Plus for a length you choose, and it ends by itself when the time is up. They
          are redeemed only on each app&apos;s website, never inside the apps, and the grant is stored on the server, so
          it applies on iOS, Android, and the web.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {summaries.map(({ app, status }) => (
          <div key={app.id} className={`${adminPanelClasses} flex flex-col gap-4 p-5`}>
            <Link href={`/dashboard/apps/${app.id}`} className="flex items-center gap-4">
              <Image src={app.icon} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block text-lg text-admin-fg">{app.name}</span>
                <span className="block text-sm text-admin-muted">{app.tagline}</span>
                <span className="block text-xs text-admin-subtle">{status}</span>
              </span>
            </Link>
            <div className="flex flex-wrap gap-4">
              <Link href={`/dashboard/apps/${app.id}`} className={adminLinkClasses}>
                Friend codes
              </Link>
              <a href={app.baseUrl} target="_blank" rel="noreferrer" className={adminLinkClasses}>
                Website
              </a>
              {app.appStoreUrl ? (
                <a href={app.appStoreUrl} target="_blank" rel="noreferrer" className={adminLinkClasses}>
                  App Store
                </a>
              ) : (
                <span className="text-sm text-admin-subtle">Not on the App Store yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
