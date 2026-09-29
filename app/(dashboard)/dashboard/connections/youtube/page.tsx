import Link from "next/link";
import { AppLogo } from "@/components/admin/google-app-icon";
import { adminLinkClasses, adminPanelClasses } from "@/components/admin/styles";
import { ToolsList } from "@/components/admin/tools-list";
import { listConnections } from "@/lib/connections/store";
import { TRANSCRIPT_FOLDER } from "@/lib/youtube/drive";
import { listTranscriptStats } from "@/lib/youtube/cache";
import { getYouTubeToolCatalog } from "@/lib/mcp/tool-catalog";
import { requireAdminSession } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";

export default async function YouTubeTranscriptsPage() {
  // Checked here, before any data is read, and not only in the layout. The
  // App Router renders a layout and its page in parallel, so a layout redirect
  // does not stop this page's data from being fetched and serialized into the
  // response. Anonymous requests were receiving it.
  await requireAdminSession();

  const [connections, stats] = await Promise.all([
    listConnections(),
    listTranscriptStats(14).catch(() => []),
  ]);
  const active = connections.filter((connection) => connection.status === "active");
  const totals = stats.reduce(
    (sum, day) => ({
      total: sum.total + day.total,
      hit: sum.hit + day.hit,
      fetched: sum.fetched + day.fetched,
      blocked: sum.blocked + day.blocked,
      failed: sum.failed + day.failed,
    }),
    { total: 0, hit: 0, fetched: 0, blocked: 0, failed: 0 },
  );
  const lastError = stats.find((day) => day.lastError)?.lastError;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/connections" className={adminLinkClasses}>
        ← Apps
      </Link>

      <section className={`${adminPanelClasses} p-6`}>
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-admin-border bg-admin-inset">
            <AppLogo slug="youtube" url="https://www.youtube.com" className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-2xl tracking-tight">YouTube transcripts</h2>
            <p className="text-sm text-admin-muted">
              Captions as text, on the apps connector. Granted with google:read.
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-sm text-admin-muted">
          The full .txt is written to{" "}
          <span className="text-admin-fg">{TRANSCRIPT_FOLDER}</span> in the connected
          account&apos;s Drive, which needs google:write; only the opening lines come back in
          the conversation. Every successful fetch is cached by video and language, so the same
          podcast is never pulled twice. When YouTube throttles this server the tool says so and
          returns nothing rather than an empty file.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Accounts", value: `${active.length} active` },
            { label: "Fetched (14d)", value: String(totals.fetched) },
            { label: "From cache", value: String(totals.hit) },
            { label: "Blocked", value: String(totals.blocked + totals.failed) },
          ].map((item) => (
            <div key={item.label} className="border border-admin-border bg-admin-inset p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-admin-muted">{item.label}</dt>
              <dd className="mt-2 text-xl text-admin-fg">{item.value}</dd>
            </div>
          ))}
        </dl>

        {active.length === 0 ? (
          <p className="mt-5 text-sm text-admin-warning-fg">
            No Google account is connected, so transcripts can only come back inline.{" "}
            <Link href="/dashboard/connections/gmail?connect=1" className="underline">
              Connect one
            </Link>
            .
          </p>
        ) : null}

        {lastError ? (
          <p className="mt-5 text-sm text-admin-muted">
            Most recent refusal: <span className="text-admin-fg">{lastError}</span>
          </p>
        ) : null}
      </section>

      {stats.length > 0 ? (
        <section className={`${adminPanelClasses} p-6`}>
          <h3 className="text-xl">Recent days</h3>
          <ul className="mt-4 divide-y divide-admin-border text-sm">
            {stats.map((day) => (
              <li key={day.day} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
                <span className="text-admin-fg">{day.day}</span>
                <span className="text-admin-muted">{day.fetched} fetched</span>
                <span className="text-admin-muted">{day.hit} cached</span>
                <span className={day.blocked > 0 ? "text-admin-danger-fg" : "text-admin-muted"}>
                  {day.blocked} blocked
                </span>
                <span className="text-admin-muted">{day.failed} other failures</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ToolsList
        tools={getYouTubeToolCatalog().map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          badge: tool.scope,
          destructive: tool.destructive,
        }))}
      />
    </div>
  );
}
