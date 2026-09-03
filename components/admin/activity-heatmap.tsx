import type { ActivitySummary } from "@/lib/mcp/activity";
import { adminPanelClasses } from "@/components/admin/styles";

const LEVELS = [
  "var(--admin-hover-strong)",
  "rgba(22, 163, 74, 0.35)",
  "rgba(22, 163, 74, 0.6)",
  "rgba(22, 163, 74, 0.85)",
  "#16a34a",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function levelFor(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/**
 * GitHub-style contribution grid: one column per week, seven rows per column.
 * Cells are sized by the container (aspect-square in a fluid grid), so the
 * graph always spans the full panel; below ~700px it scrolls instead.
 */
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

  // A month label sits over the first column whose first day starts that month.
  const monthLabels = weeks.map((week, index) => {
    const month = new Date(`${week[0].date}T00:00:00Z`).getUTCMonth();
    const previous = index > 0 ? new Date(`${weeks[index - 1][0].date}T00:00:00Z`).getUTCMonth() : -1;
    return month !== previous && index !== 0 ? MONTHS[month] : "";
  });

  const columns = `repeat(${weeks.length}, minmax(0, 1fr))`;

  return (
    <section className={`${adminPanelClasses} p-6`}>
      <h2 className="text-2xl tracking-tight">{greeting}</h2>

      <div className="mt-6 overflow-x-auto">
        <div style={{ minWidth: `${weeks.length * 13}px` }}>
          <div
            className="grid text-[10px] uppercase tracking-[0.15em] text-admin-subtle"
            style={{ gridTemplateColumns: columns, gap: "3px" }}
          >
            {monthLabels.map((label, index) => (
              <div key={index} className="h-4 overflow-visible whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: columns,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridAutoFlow: "column",
              gap: "3px",
            }}
          >
            {weeks.flatMap((week) =>
              week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} tool call${day.count === 1 ? "" : "s"}`}
                  className="aspect-square w-full rounded-[2px]"
                  style={{ background: LEVELS[levelFor(day.count)] }}
                />
              )),
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          {[
            ["Tool calls", String(summary.totalCalls)],
            ["Streak", `${summary.currentStreak} ${summary.currentStreak === 1 ? "day" : "days"}`],
            ["Longest", `${summary.longestStreak} ${summary.longestStreak === 1 ? "day" : "days"}`],
            ["Active days", String(summary.activeDays)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">{label}</dt>
              <dd className="mt-1 text-3xl tracking-tight">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-2 text-xs text-admin-subtle">
          Less
          {LEVELS.map((color) => (
            <span key={color} className="h-3 w-3 rounded-[2px]" style={{ background: color }} />
          ))}
          More
        </div>
      </div>
    </section>
  );
}
