import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FriendCodesManager } from "@/components/admin/friend-codes-manager";
import { adminLinkClasses, adminPanelClasses } from "@/components/admin/styles";
import { isAppAdminConfigured } from "@/lib/apps/codes-client";
import { getManagedApp } from "@/lib/apps/registry";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function ManagedAppPage({ params }: { params: Promise<{ app: string }> }) {
  // Checked here, before anything else, and not only in the layout. The App
  // Router renders a layout and its page in parallel.
  await requireAdminSession();

  const app = getManagedApp((await params).app);
  if (!app) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/apps" className={adminLinkClasses}>
        ← Apps
      </Link>
      <section className={`${adminPanelClasses} flex flex-col gap-4 p-6 sm:flex-row sm:items-center`}>
        <Image src={app.icon} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl">{app.name}</h2>
          <p className="text-sm text-admin-muted">{app.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href={app.baseUrl} target="_blank" rel="noreferrer" className={adminLinkClasses}>
            {app.baseUrl.replace("https://", "")}
          </a>
          {app.appStoreUrl ? (
            <a href={app.appStoreUrl} target="_blank" rel="noreferrer" className={adminLinkClasses}>
              App Store
            </a>
          ) : null}
        </div>
      </section>

      <FriendCodesManager app={app} configured={isAppAdminConfigured(app)} />
    </div>
  );
}
