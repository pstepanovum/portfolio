import type { ActivitySummary } from "@/lib/mcp/activity";
import { adminPanelClasses } from "@/components/admin/styles";

const LEVELS = [
  "var(--admin-hover-strong)",
  "rgba(22, 163, 74, 0.35)",
  "rgba(22, 163, 74, 0.6)",
  "rgba(22, 163, 74, 0.85)",
  "#16a34a",
];

function levelFor(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/** GitHub-style contribution grid: one column per week, seven rows per column. */
export function ActivityHeatmap({
  summary,
  greeting,
}: {
  summary: ActivitySummary;
  greeting: string;
}) {
  const weeks: ActivitySummary["days"][] = [];
  for (let index = 0; index < summary.days.length; index += 7) {
    weeks.push(summary.days.slice(index, index + 7));
  }

  return (
    <section className={`${adminPanelClasses} p-6`}>
      <h2 className="text-2xl tracking-tight">{greeting}</h2>

      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-[3px]" style={{ minWidth: `${weeks.length * 13}px` }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} tool call${day.count === 1 ? "" : "s"}`}
                  className="h-[10px] w-[10px] rounded-[2px]"
                  style={{ background: LEVELS[levelFor(day.count)] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <dl className="mt-6 flex flex-wrap gap-10">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Tool calls</dt>
          <dd className="mt-1 text-3xl tracking-tight">{summary.totalCalls}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Streak</dt>
          <dd className="mt-1 text-3xl tracking-tight">
            {summary.currentStreak} {summary.currentStreak === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Longest</dt>
          <dd className="mt-1 text-3xl tracking-tight">
            {summary.longestStreak} {summary.longestStreak === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">Active days</dt>
          <dd className="mt-1 text-3xl tracking-tight">{summary.activeDays}</dd>
        </div>
      </dl>
    </section>
  );
}
