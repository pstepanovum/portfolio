import Link from "next/link";
import {
  adminBadgeClasses,
  adminLinkClasses,
  adminPanelClasses,
} from "@/components/admin/styles";
import { getDashboardOverview, getDashboardSettings } from "@/lib/firebase/portfolio";

const dashboardSections = [
  {
    href: "/dashboard/projects",
    label: "Projects",
    description: "Edit featured work, web apps, AI projects, links, tags, and images.",
  },
  {
    href: "/dashboard/certifications",
    label: "Certifications",
    description: "Manage issuers, dates, credential details, skills, and logos.",
  },
  {
    href: "/dashboard/experience",
    label: "Timeline",
    description: "Update the about-page timeline with roles, summaries, and technologies.",
  },
  {
    href: "/dashboard/contacts",
    label: "Contacts",
    description: "Review form submissions stored in Firestore and keep statuses organized.",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Tune the Gemini drafting model and prompt used for faster project entry.",
  },
];

export default async function DashboardPage() {
  const [overview, settings] = await Promise.all([
    getDashboardOverview(),
    getDashboardSettings(),
  ]);

  const metrics = [
    { label: "Projects", value: overview.projects },
    { label: "Certifications", value: overview.certifications },
    { label: "Timeline Entries", value: overview.experiences },
    { label: "Contacts", value: overview.contacts },
    { label: "Unread Contacts", value: overview.unreadContacts },
  ];

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className={adminBadgeClasses}>Overview</span>
            <h2 className="text-3xl tracking-tight">One place for the portfolio content stack.</h2>
            <p className="max-w-3xl text-admin-muted">
              The public website keeps its current look and copy, while this
              dashboard handles the structured content underneath through
              Firebase Auth, Firestore, Storage, and Gemini-assisted drafting.
            </p>
          </div>

          <div className="border border-admin-border bg-admin-inset px-4 py-3 text-sm text-admin-muted">
            Active Gemini model:{" "}
            <span className="text-admin-fg">{settings.geminiModel}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className={`${adminPanelClasses} p-5`}>
            <div className="text-xs uppercase tracking-[0.22em] text-admin-subtle">
              {metric.label}
            </div>
            <div className="mt-4 text-4xl tracking-tight">{metric.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {dashboardSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`${adminPanelClasses} p-6 transition-colors hover:bg-admin-accent/[0.05]`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <h3 className="text-xl">{section.label}</h3>
                <p className="max-w-xl text-sm text-admin-muted">
                  {section.description}
                </p>
              </div>
              <span className={adminLinkClasses}>Open</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
