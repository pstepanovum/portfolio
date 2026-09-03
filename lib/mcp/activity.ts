import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";

const COLLECTION = "activity";
const HEATMAP_DAYS = 371; // 53 columns of 7, so the grid always starts on a full week

export type ActivityServer = "portfolio" | "apps";

export type ActivityEntry = {
  id: string;
  server: ActivityServer;
  tool: string;
  account?: string;
  clientId: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  createdAt: string;
};

export type ActivityDay = { date: string; count: number };

export type ActivitySummary = {
  days: ActivityDay[];
  totalCalls: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
};

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Every tool invocation on either server lands here; failures never surface. */
export async function recordToolCall(entry: Omit<ActivityEntry, "id" | "createdAt">) {
  try {
    await adminDb.collection(COLLECTION).add({
      ...entry,
      account: entry.account ?? null,
      error: entry.error ? entry.error.slice(0, 500) : null,
      day: toDayKey(new Date()),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Logging must never break a tool call.
  }
}

/**
 * Wraps a server so every registered tool is timed and logged. A Proxy keeps
 * the tool files untouched: they call registerTool as before and the wrapper
 * sees each callback on the way through.
 */
export function withActivityLogging(
  server: McpServer,
  context: { server: ActivityServer; clientId: string },
): McpServer {
  type AnyCallback = (...args: unknown[]) => Promise<unknown> | unknown;

  return new Proxy(server, {
    get(target, property, receiver) {
      if (property !== "registerTool") {
        return Reflect.get(target, property, receiver);
      }

      return (name: string, config: unknown, callback: AnyCallback) => {
        const wrapped: AnyCallback = async (...args) => {
          const started = Date.now();
          const first = args[0];
          const account =
            first && typeof first === "object" && "account" in first &&
            typeof (first as { account?: unknown }).account === "string"
              ? (first as { account: string }).account
              : undefined;

          try {
            const result = await callback(...args);
            const isError =
              Boolean(result) && typeof result === "object" && "isError" in (result as object)
                ? Boolean((result as { isError?: boolean }).isError)
                : false;
            const errorText = isError
              ? String(
                  (result as { content?: { text?: string }[] }).content?.[0]?.text ?? "Tool reported an error.",
                )
              : undefined;

            await recordToolCall({
              server: context.server,
              tool: name,
              account,
              clientId: context.clientId,
              ok: !isError,
              durationMs: Date.now() - started,
              error: errorText,
            });

            return result;
          } catch (error) {
            await recordToolCall({
              server: context.server,
              tool: name,
              account,
              clientId: context.clientId,
              ok: false,
              durationMs: Date.now() - started,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        };

        return (target.registerTool as unknown as (n: string, c: unknown, cb: AnyCallback) => unknown)(
          name,
          config,
          wrapped,
        );
      };
    },
  });
}

export async function listRecentActivity(limit = 30): Promise<ActivityEntry[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(limit, 1), 200))
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0);

    return {
      id: doc.id,
      server: data.server === "portfolio" ? "portfolio" : "apps",
      tool: typeof data.tool === "string" ? data.tool : "unknown",
      account: typeof data.account === "string" ? data.account : undefined,
      clientId: typeof data.clientId === "string" ? data.clientId : "",
      ok: Boolean(data.ok),
      durationMs: typeof data.durationMs === "number" ? data.durationMs : 0,
      error: typeof data.error === "string" ? data.error : undefined,
      createdAt: createdAt.toISOString(),
    };
  });
}

/** Per-day counts for the last 53 weeks, plus totals and streaks (UTC days). */
export async function getActivitySummary(): Promise<ActivitySummary> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (HEATMAP_DAYS - 1));

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("createdAt", ">=", Timestamp.fromDate(since))
    .select("day")
    .get();

  const counts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const day = (doc.data() as { day?: string }).day;
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const days: ActivityDay[] = [];
  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = toDayKey(date);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }

  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  // Current streak counts back from today, or from yesterday if today is quiet.
  let current = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].count > 0) current += 1;
    else if (index === days.length - 1) continue;
    else break;
  }

  return {
    days,
    totalCalls: snapshot.size,
    currentStreak: current,
    longestStreak: longest,
    activeDays: counts.size,
  };
}
