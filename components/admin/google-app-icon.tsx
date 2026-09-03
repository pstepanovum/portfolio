import {
  CalendarIcon,
  DocsIcon,
  DriveIcon,
  GmailIcon,
  SheetsIcon,
  SlidesIcon,
  TasksIcon,
} from "@/components/admin/app-icons";
import type { GoogleAppKey } from "@/lib/connections/google-apps";

const ICONS: Record<GoogleAppKey, (props: { className?: string }) => React.JSX.Element> = {
  gmail: GmailIcon,
  calendar: CalendarIcon,
  drive: DriveIcon,
  sheets: SheetsIcon,
  docs: DocsIcon,
  tasks: TasksIcon,
  slides: SlidesIcon,
};

export function GoogleAppIcon({ app, className }: { app: GoogleAppKey; className?: string }) {
  const Icon = ICONS[app];
  return <Icon className={className} />;
}
