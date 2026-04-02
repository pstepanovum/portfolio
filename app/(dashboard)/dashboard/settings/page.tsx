import SettingsManager from "@/components/admin/settings-manager";
import { getDashboardSettings } from "@/lib/firebase/portfolio";

export default async function DashboardSettingsPage() {
  const settings = await getDashboardSettings();

  return (
    <SettingsManager
      initialSettings={settings}
      geminiConfigured={Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY)}
      storageBucket={
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        "pstepanovdev.firebasestorage.app"
      }
    />
  );
}
