import { and, desc, eq, gte, lte } from "drizzle-orm";
import { newId } from "./id";
import * as schema from "./schema";
import type { AppDatabase } from "./repository";
import { getLocalDate, LOCAL_USER_ID } from "./types";

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export type HearingRange = 7 | 14 | 30;

export type HearingEvidence = {
  question: string;
  wantId?: string;
  rangeStart: string;
  rangeEnd: string;
  daysLogged: number;
  hasEnoughData: boolean;
  want?: {
    name: string;
    done: number;
    skipped: number;
    light: number;
    lastDoneDate: string | null;
    skipCues: Record<string, number>;
  };
  mood: {
    avgValence: number | null;
    lowDays: number;
    topLabels: { label: string; count: number }[];
  };
  habits: {
    name: string;
    skipped: number;
  }[];
  spend: {
    total: number;
    byScenario: Record<string, number>;
    impulseOnLowMoodDays: number;
  };
  unusualNotes: { date: string; note: string }[];
  patterns: string[];
};

function dateDaysAgo(localDate: string, days: number): string {
  const d = new Date(`${localDate}T12:00:00`);
  d.setDate(d.getDate() - days);
  return getLocalDate(d);
}

export async function buildHearingEvidence(
  db: AppDatabase,
  input: {
    question: string;
    wantId?: string;
    rangeDays: HearingRange;
    endDate?: string;
  }
): Promise<HearingEvidence> {
  const rangeEnd = input.endDate ?? getLocalDate();
  const rangeStart = dateDaysAgo(rangeEnd, input.rangeDays - 1);

  const dayLogs = await db
    .select()
    .from(schema.dayLogs)
    .where(
      and(
        eq(schema.dayLogs.userId, LOCAL_USER_ID),
        gte(schema.dayLogs.localDate, rangeStart),
        lte(schema.dayLogs.localDate, rangeEnd)
      )
    )
    .orderBy(desc(schema.dayLogs.localDate));

  const daysLogged = dayLogs.length;
  const hasEnoughData = daysLogged >= 14;

  const dayLogIds = dayLogs.map((d) => d.id);
  const dayLogById = new Map(dayLogs.map((d) => [d.id, d]));

  const moods =
    dayLogIds.length > 0
      ? await db.select().from(schema.moodEntries).where(
          and(
            eq(schema.moodEntries.userId, LOCAL_USER_ID),
            eq(schema.moodEntries.isCanonical, true)
          )
        )
      : [];

  const rangeMoods = moods.filter((m) => dayLogIds.includes(m.dayLogId));
  const valences = rangeMoods.map((m) => m.valence);
  const avgValence =
    valences.length > 0
      ? Math.round((valences.reduce((a, b) => a + b, 0) / valences.length) * 10) / 10
      : null;
  const lowDays = rangeMoods.filter((m) => m.valence <= 2).length;

  const labelCounts: Record<string, number> = {};
  for (const m of rangeMoods) {
    if (m.label) labelCounts[m.label] = (labelCounts[m.label] ?? 0) + 1;
  }
  const topLabels = Object.entries(labelCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lowMoodDayLogIds = new Set(
    rangeMoods.filter((m) => m.valence <= 2).map((m) => m.dayLogId)
  );

  const habits = await db
    .select()
    .from(schema.habitEntries)
    .where(eq(schema.habitEntries.userId, LOCAL_USER_ID));

  const rangeHabits = habits.filter((h) => dayLogIds.includes(h.dayLogId));

  let wantSection: HearingEvidence["want"];
  if (input.wantId) {
    const [want] = await db
      .select()
      .from(schema.wants)
      .where(eq(schema.wants.id, input.wantId))
      .limit(1);

    const wantHabits = rangeHabits.filter((h) => h.wantId === input.wantId);
    const skipCues: Record<string, number> = {};
    for (const h of wantHabits) {
      if (h.status !== "skipped") continue;
      for (const tag of parseTags(h.cueTags)) {
        skipCues[tag] = (skipCues[tag] ?? 0) + 1;
      }
    }

    const lastDone = wantHabits
      .filter((h) => h.status === "done" || h.status === "light")
      .map((h) => dayLogById.get(h.dayLogId)?.localDate)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

    wantSection = want
      ? {
          name: want.name,
          done: wantHabits.filter((h) => h.status === "done").length,
          skipped: wantHabits.filter((h) => h.status === "skipped").length,
          light: wantHabits.filter((h) => h.status === "light").length,
          lastDoneDate: lastDone ?? null,
          skipCues,
        }
      : undefined;
  }

  const allWants = await db
    .select()
    .from(schema.wants)
    .where(eq(schema.wants.userId, LOCAL_USER_ID));

  const habitSummary = allWants
    .filter((w) => w.id !== input.wantId)
    .map((w) => ({
      name: w.name,
      skipped: rangeHabits.filter(
        (h) => h.wantId === w.id && h.status === "skipped"
      ).length,
    }))
    .filter((h) => h.skipped > 0)
    .sort((a, b) => b.skipped - a.skipped);

  const spends = await db
    .select()
    .from(schema.spendEntries)
    .where(eq(schema.spendEntries.userId, LOCAL_USER_ID));

  const rangeSpends = spends.filter((s) => dayLogIds.includes(s.dayLogId));
  const byScenario: Record<string, number> = {};
  for (const s of rangeSpends) {
    byScenario[s.scenario] = (byScenario[s.scenario] ?? 0) + 1;
  }
  const impulseOnLowMoodDays = rangeSpends.filter(
    (s) => s.scenario === "impulse" && lowMoodDayLogIds.has(s.dayLogId)
  ).length;

  const unusualNotes = dayLogs
    .filter((d) => d.unusualNote)
    .map((d) => ({ date: d.localDate, note: d.unusualNote! }));

  const patterns: string[] = [];
  if (!hasEnoughData) {
    patterns.push("Need at least 14 days logged for reliable patterns.");
  } else {
    if (wantSection && wantSection.skipped > wantSection.done) {
      patterns.push(
        `${wantSection.name}: more skips (${wantSection.skipped}) than completions (${wantSection.done}) in this period.`
      );
    }
    if (lowDays >= 5) {
      patterns.push(`Low mood (≤2) on ${lowDays} days in range.`);
    }
    if (impulseOnLowMoodDays >= 2) {
      patterns.push(
        `Impulse spending on ${impulseOnLowMoodDays} low-mood days — possible link (pattern, not cause).`
      );
    }
    const topCue = wantSection
      ? Object.entries(wantSection.skipCues).sort((a, b) => b[1] - a[1])[0]
      : null;
    if (topCue) {
      patterns.push(
        `Most common skip cue for ${wantSection!.name}: "${topCue[0]}" (${topCue[1]}×).`
      );
    }
  }

  return {
    question: input.question,
    wantId: input.wantId,
    rangeStart,
    rangeEnd,
    daysLogged,
    hasEnoughData,
    want: wantSection,
    mood: { avgValence, lowDays, topLabels },
    habits: habitSummary,
    spend: {
      total: rangeSpends.length,
      byScenario,
      impulseOnLowMoodDays,
    },
    unusualNotes,
    patterns,
  };
}

export async function saveHearing(
  db: AppDatabase,
  input: {
    question: string;
    wantId?: string;
    rangeStart: string;
    rangeEnd: string;
    ruling?: string;
    note?: string;
  }
) {
  const entry = {
    id: newId(),
    userId: LOCAL_USER_ID,
    question: input.question,
    wantId: input.wantId ?? null,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    ruling: input.ruling ?? null,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.insert(schema.hearings).values(entry);
  return entry;
}

export async function pauseWant(db: AppDatabase, wantId: string) {
  await db
    .update(schema.wants)
    .set({ status: "paused", updatedAt: new Date().toISOString() })
    .where(eq(schema.wants.id, wantId));
}

export async function getSavedHearings(db: AppDatabase, limit = 10) {
  return db
    .select()
    .from(schema.hearings)
    .where(eq(schema.hearings.userId, LOCAL_USER_ID))
    .orderBy(desc(schema.hearings.createdAt))
    .limit(limit);
}
