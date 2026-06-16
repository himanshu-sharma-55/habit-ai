import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { newId } from "./id";
import * as schema from "./schema";
import {
  deriveAmountBand,
  getLocalDate,
  getWeekStart,
  LOCAL_USER_ID,
  WANT_TEMPLATES,
  isHabitWant,
  type AmountBand,
  type CheckInRhythm,
  type HabitStatus,
  type SpendCategory,
  type SpendScenario,
} from "./types";

export type AppDatabase = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

function now() {
  return new Date().toISOString();
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export async function ensureDefaultSettings(db: AppDatabase) {
  const existing = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, LOCAL_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(schema.userSettings).values({
      id: newId(),
      userId: LOCAL_USER_ID,
      checkInRhythm: "daily",
      checkInTime: "21:00",
      haptics: true,
      reduceMotion: false,
      onboardingComplete: false,
      updatedAt: now(),
    });
  }
}

export async function getSettings(db: AppDatabase) {
  await ensureDefaultSettings(db);
  const [settings] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, LOCAL_USER_ID))
    .limit(1);
  return settings;
}

export async function completeOnboarding(
  db: AppDatabase,
  input: {
    templateIds: string[];
    rhythm: CheckInRhythm;
    checkInTime?: string;
  }
) {
  const settings = await getSettings(db);
  const timestamp = now();

  if (!settings.onboardingComplete) {
    for (const templateId of input.templateIds) {
      const template = WANT_TEMPLATES.find((t) => t.id === templateId);
      if (!template || !isHabitWant(template.category)) continue;

      const existing = await db
        .select()
        .from(schema.wants)
        .where(
          and(
            eq(schema.wants.userId, LOCAL_USER_ID),
            eq(schema.wants.name, template.name),
            eq(schema.wants.status, "active")
          )
        )
        .limit(1);

      if (existing[0]) continue;

      await db.insert(schema.wants).values({
        id: newId(),
        userId: LOCAL_USER_ID,
        name: template.name,
        category: template.category,
        frequencyType: template.frequencyType,
        frequencyTarget: template.frequencyTarget,
        minimumBar: template.minimumBar ?? null,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  await db
    .update(schema.userSettings)
    .set({
      checkInRhythm: input.rhythm,
      checkInTime: input.checkInTime ?? "21:00",
      onboardingComplete: true,
      updatedAt: timestamp,
    })
    .where(eq(schema.userSettings.userId, LOCAL_USER_ID));
}

export async function getActiveWants(db: AppDatabase) {
  const rows = await db
    .select()
    .from(schema.wants)
    .where(
      and(
        eq(schema.wants.userId, LOCAL_USER_ID),
        eq(schema.wants.status, "active")
      )
    );

  const byName = new Map<string, (typeof rows)[number]>();
  for (const want of rows) {
    if (!isHabitWant(want.category)) continue;
    const prev = byName.get(want.name);
    if (!prev || want.updatedAt > prev.updatedAt) {
      byName.set(want.name, want);
    }
  }

  return Array.from(byName.values());
}

export async function getOrCreateDayLog(db: AppDatabase, localDate: string) {
  const existing = await db
    .select()
    .from(schema.dayLogs)
    .where(
      and(
        eq(schema.dayLogs.userId, LOCAL_USER_ID),
        eq(schema.dayLogs.localDate, localDate)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const dayLog = {
    id: newId(),
    userId: LOCAL_USER_ID,
    localDate,
    unusualNote: null,
    sleepQuality: null,
    energyLevel: null,
    contextTags: null,
    completedAt: null,
    deviceId: "mobile",
    syncStatus: "pending" as const,
    updatedAt: now(),
  };

  await db.insert(schema.dayLogs).values(dayLog);
  return dayLog;
}

export async function getDayLogWithEntries(
  db: AppDatabase,
  localDate: string
) {
  const dayLog = await getOrCreateDayLog(db, localDate);
  const moods = await db
    .select()
    .from(schema.moodEntries)
    .where(eq(schema.moodEntries.dayLogId, dayLog.id))
    .orderBy(desc(schema.moodEntries.updatedAt));

  const habits = await db
    .select()
    .from(schema.habitEntries)
    .where(eq(schema.habitEntries.dayLogId, dayLog.id));

  const spends = await db
    .select()
    .from(schema.spendEntries)
    .where(eq(schema.spendEntries.dayLogId, dayLog.id))
    .orderBy(desc(schema.spendEntries.createdAt));

  const canonicalMood = moods.find((m) => m.isCanonical) ?? null;

  return { dayLog, canonicalMood, moodHistory: moods, habits, spends };
}

export async function saveMood(
  db: AppDatabase,
  input: {
    localDate: string;
    valence: number;
    label?: string;
    justification?: string;
    cueTags?: string[];
    isQuickLog?: boolean;
  }
) {
  const dayLog = await getOrCreateDayLog(db, input.localDate);
  const timestamp = now();

  if (!input.isQuickLog) {
    await db
      .update(schema.moodEntries)
      .set({ isCanonical: false, updatedAt: timestamp })
      .where(
        and(
          eq(schema.moodEntries.dayLogId, dayLog.id),
          eq(schema.moodEntries.isCanonical, true)
        )
      );
  }

  const entry = {
    id: newId(),
    userId: LOCAL_USER_ID,
    dayLogId: dayLog.id,
    isCanonical: !input.isQuickLog,
    valence: input.valence,
    label: input.label ?? null,
    justification: input.justification ?? null,
    cueTags: serializeTags(input.cueTags ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(schema.moodEntries).values(entry);
  await db
    .update(schema.dayLogs)
    .set({ updatedAt: timestamp, syncStatus: "pending" })
    .where(eq(schema.dayLogs.id, dayLog.id));

  return entry;
}

export async function saveHabit(
  db: AppDatabase,
  input: {
    localDate: string;
    wantId: string;
    status: HabitStatus;
    cueTags?: string[];
    note?: string;
  }
) {
  const dayLog = await getOrCreateDayLog(db, input.localDate);
  const timestamp = now();

  const existing = await db
    .select()
    .from(schema.habitEntries)
    .where(
      and(
        eq(schema.habitEntries.dayLogId, dayLog.id),
        eq(schema.habitEntries.wantId, input.wantId)
      )
    )
    .limit(1);

  const values = {
    status: input.status,
    cueTags: serializeTags(input.cueTags ?? []),
    note: input.note ?? null,
    updatedAt: timestamp,
  };

  if (existing[0]) {
    await db
      .update(schema.habitEntries)
      .set(values)
      .where(eq(schema.habitEntries.id, existing[0].id));
    return { ...existing[0], ...values };
  }

  const entry = {
    id: newId(),
    userId: LOCAL_USER_ID,
    dayLogId: dayLog.id,
    wantId: input.wantId,
    ...values,
    createdAt: timestamp,
  };

  await db.insert(schema.habitEntries).values(entry);
  await db
    .update(schema.dayLogs)
    .set({ updatedAt: timestamp, syncStatus: "pending" })
    .where(eq(schema.dayLogs.id, dayLog.id));

  return entry;
}

export async function saveSpend(
  db: AppDatabase,
  input: {
    localDate: string;
    amountBand?: AmountBand;
    amountExact?: number;
    category: SpendCategory | string;
    scenario: SpendScenario | string;
    note?: string;
  }
) {
  const dayLog = await getOrCreateDayLog(db, input.localDate);
  const timestamp = now();
  const band =
    input.amountExact != null
      ? deriveAmountBand(input.amountExact)
      : (input.amountBand ?? "medium");

  const entry = {
    id: newId(),
    userId: LOCAL_USER_ID,
    dayLogId: dayLog.id,
    amountExact: input.amountExact ?? null,
    amountBand: band,
    category: input.category,
    scenario: input.scenario,
    note: input.note ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(schema.spendEntries).values(entry);
  await db
    .update(schema.dayLogs)
    .set({ updatedAt: timestamp, syncStatus: "pending" })
    .where(eq(schema.dayLogs.id, dayLog.id));

  return entry;
}

export async function deleteSpend(db: AppDatabase, spendId: string) {
  await db
    .delete(schema.spendEntries)
    .where(eq(schema.spendEntries.id, spendId));
}

export async function saveUnusualNote(
  db: AppDatabase,
  localDate: string,
  note: string | null
) {
  const dayLog = await getOrCreateDayLog(db, localDate);
  const timestamp = now();
  await db
    .update(schema.dayLogs)
    .set({
      unusualNote: note,
      updatedAt: timestamp,
      syncStatus: "pending",
    })
    .where(eq(schema.dayLogs.id, dayLog.id));
}

export async function saveDayContext(
  db: AppDatabase,
  localDate: string,
  input: {
    sleepQuality?: string | null;
    energyLevel?: string | null;
    contextTags?: string[];
  }
) {
  const dayLog = await getOrCreateDayLog(db, localDate);
  const timestamp = now();
  const patch: Partial<typeof schema.dayLogs.$inferInsert> = {
    updatedAt: timestamp,
    syncStatus: "pending",
  };

  if (input.sleepQuality !== undefined) {
    patch.sleepQuality = input.sleepQuality;
  }
  if (input.energyLevel !== undefined) {
    patch.energyLevel = input.energyLevel;
  }
  if (input.contextTags !== undefined) {
    patch.contextTags = serializeTags(input.contextTags);
  }

  await db
    .update(schema.dayLogs)
    .set(patch)
    .where(eq(schema.dayLogs.id, dayLog.id));
}

export async function updateSettings(
  db: AppDatabase,
  input: {
    checkInRhythm?: CheckInRhythm;
    checkInTime?: string;
    haptics?: boolean;
    reduceMotion?: boolean;
  }
) {
  await ensureDefaultSettings(db);
  const timestamp = now();
  await db
    .update(schema.userSettings)
    .set({ ...input, updatedAt: timestamp })
    .where(eq(schema.userSettings.userId, LOCAL_USER_ID));
}

export async function addCustomWant(
  db: AppDatabase,
  input: {
    name: string;
    frequencyType: "daily" | "weekly";
    frequencyTarget?: number;
    category?: string;
  }
) {
  const timestamp = now();
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("Want name is required");

  const existing = await db
    .select()
    .from(schema.wants)
    .where(
      and(
        eq(schema.wants.userId, LOCAL_USER_ID),
        eq(schema.wants.name, trimmed),
        eq(schema.wants.status, "active")
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const entry = {
    id: newId(),
    userId: LOCAL_USER_ID,
    name: trimmed,
    category: input.category ?? "custom",
    frequencyType: input.frequencyType,
    frequencyTarget:
      input.frequencyTarget ??
      (input.frequencyType === "weekly" ? 3 : 1),
    minimumBar: null,
    status: "active" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(schema.wants).values(entry);
  return entry;
}

export async function updateWant(
  db: AppDatabase,
  wantId: string,
  input: {
    name?: string;
    frequencyType?: "daily" | "weekly";
    frequencyTarget?: number;
    minimumBar?: string | null;
  }
) {
  const patch: Partial<typeof schema.wants.$inferInsert> = {
    updatedAt: now(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.frequencyType !== undefined) patch.frequencyType = input.frequencyType;
  if (input.frequencyTarget !== undefined) {
    patch.frequencyTarget = input.frequencyTarget;
  }
  if (input.minimumBar !== undefined) patch.minimumBar = input.minimumBar;

  await db
    .update(schema.wants)
    .set(patch)
    .where(eq(schema.wants.id, wantId));
}

export async function resumeWant(db: AppDatabase, wantId: string) {
  await db
    .update(schema.wants)
    .set({ status: "active", updatedAt: now() })
    .where(eq(schema.wants.id, wantId));
}

export async function getPausedWants(db: AppDatabase) {
  return db
    .select()
    .from(schema.wants)
    .where(
      and(
        eq(schema.wants.userId, LOCAL_USER_ID),
        eq(schema.wants.status, "paused")
      )
    );
}

export async function completeCheckIn(db: AppDatabase, localDate: string) {
  const dayLog = await getOrCreateDayLog(db, localDate);
  const timestamp = now();
  await db
    .update(schema.dayLogs)
    .set({ completedAt: timestamp, updatedAt: timestamp })
    .where(eq(schema.dayLogs.id, dayLog.id));
}

export async function getTimeline(db: AppDatabase, limit = 30) {
  const logs = await db
    .select()
    .from(schema.dayLogs)
    .where(eq(schema.dayLogs.userId, LOCAL_USER_ID))
    .orderBy(desc(schema.dayLogs.localDate))
    .limit(limit);

  const results = [];
  for (const log of logs) {
    const detail = await getDayLogWithEntries(db, log.localDate);
    results.push(detail);
  }
  return results;
}

export async function getWantProgress(
  db: AppDatabase,
  wantId: string,
  localDate = getLocalDate()
) {
  const [want] = await db
    .select()
    .from(schema.wants)
    .where(eq(schema.wants.id, wantId))
    .limit(1);

  if (!want) return null;

  let rangeStart = localDate;
  let rangeEnd = localDate;

  if (want.frequencyType === "weekly") {
    rangeStart = getWeekStart(localDate);
  }

  const entries = await db
    .select({
      status: schema.habitEntries.status,
      localDate: schema.dayLogs.localDate,
      updatedAt: schema.habitEntries.updatedAt,
    })
    .from(schema.habitEntries)
    .innerJoin(
      schema.dayLogs,
      eq(schema.habitEntries.dayLogId, schema.dayLogs.id)
    )
    .where(
      and(
        eq(schema.habitEntries.wantId, wantId),
        gte(schema.dayLogs.localDate, rangeStart),
        lte(schema.dayLogs.localDate, rangeEnd)
      )
    );

  const doneCount = entries.filter((e) => e.status === "done" || e.status === "light").length;
  const lastDone = await db
    .select({ localDate: schema.dayLogs.localDate })
    .from(schema.habitEntries)
    .innerJoin(
      schema.dayLogs,
      eq(schema.habitEntries.dayLogId, schema.dayLogs.id)
    )
    .where(
      and(
        eq(schema.habitEntries.wantId, wantId),
        sql`${schema.habitEntries.status} IN ('done', 'light')`
      )
    )
    .orderBy(desc(schema.dayLogs.localDate))
    .limit(1);

  let daysSinceLastDone: number | null = null;
  if (lastDone[0]) {
    const last = new Date(`${lastDone[0].localDate}T12:00:00`);
    const today = new Date(`${localDate}T12:00:00`);
    daysSinceLastDone = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    want,
    target: want.frequencyTarget,
    actual: doneCount,
    gap: doneCount - want.frequencyTarget,
    lastDoneDate: lastDone[0]?.localDate ?? null,
    daysSinceLastDone,
    weekStart: want.frequencyType === "weekly" ? rangeStart : null,
  };
}

export async function getAllWantProgress(db: AppDatabase, localDate?: string) {
  const activeWants = await getActiveWants(db);
  const date = localDate ?? getLocalDate();
  const progress = [];
  for (const want of activeWants) {
    const p = await getWantProgress(db, want.id, date);
    if (p) progress.push(p);
  }
  return progress;
}

export async function getMissedYesterday(db: AppDatabase) {
  const today = getLocalDate();
  const yesterdayDate = new Date(`${today}T12:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDate(yesterdayDate);

  const [log] = await db
    .select()
    .from(schema.dayLogs)
    .where(
      and(
        eq(schema.dayLogs.userId, LOCAL_USER_ID),
        eq(schema.dayLogs.localDate, yesterday)
      )
    )
    .limit(1);

  return !log?.completedAt ? yesterday : null;
}

export { parseTags };
