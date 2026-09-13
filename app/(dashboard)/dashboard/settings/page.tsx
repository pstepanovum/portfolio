import SettingsManager from "@/components/admin/settings-manager";
import { getDashboardSettings } from "@/lib/firebase/portfolio";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const settings = await getDashboardSettings();

  return (
    <SettingsManager
      initialSettings={settings}
      geminiConfigured={Boolean(settings.geminiApiKey)}
      storageBucket={
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "pstepanovdev.firebasestorage.app"
      }
    />
  );
}
