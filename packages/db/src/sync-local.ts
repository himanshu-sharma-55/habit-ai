import { eq } from "drizzle-orm";
import type { SyncTable } from "@habit-ai/sync";
import * as schema from "./schema";
import type { AppDatabase } from "./repository";
import { LOCAL_USER_ID } from "./types";

const WATERMARK_KEY = "last_synced_at";

export async function getSyncWatermark(db: AppDatabase): Promise<string> {
  const rows = await db
    .select()
    .from(schema.syncMeta)
    .where(eq(schema.syncMeta.key, WATERMARK_KEY))
    .limit(1);
  return rows[0]?.value ?? "1970-01-01T00:00:00.000Z";
}

export async function setSyncWatermark(
  db: AppDatabase,
  watermark: string
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.syncMeta)
    .where(eq(schema.syncMeta.key, WATERMARK_KEY))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.syncMeta)
      .set({ value: watermark })
      .where(eq(schema.syncMeta.key, WATERMARK_KEY));
  } else {
    await db.insert(schema.syncMeta).values({ key: WATERMARK_KEY, value: watermark });
  }
}

export async function migrateLocalUserId(
  db: AppDatabase,
  newUserId: string
): Promise<void> {
  const tables = [
    schema.userSettings,
    schema.wants,
    schema.dayLogs,
    schema.moodEntries,
    schema.habitEntries,
    schema.spendEntries,
  ] as const;

  for (const table of tables) {
    await db
      .update(table)
      .set({ userId: newUserId })
      .where(eq(table.userId, LOCAL_USER_ID));
  }
}

type TableRow = Record<string, unknown>;

function parseCueTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

/** Collect all local rows for push */
export async function collectLocalRows(
  db: AppDatabase,
  userId: string
): Promise<Record<SyncTable, TableRow[]>> {
  const settings = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));

  const wants = await db
    .select()
    .from(schema.wants)
    .where(eq(schema.wants.userId, userId));

  const dayLogs = await db
    .select()
    .from(schema.dayLogs)
    .where(eq(schema.dayLogs.userId, userId));

  const moods = await db
    .select()
    .from(schema.moodEntries)
    .where(eq(schema.moodEntries.userId, userId));

  const habits = await db
    .select()
    .from(schema.habitEntries)
    .where(eq(schema.habitEntries.userId, userId));

  const spends = await db
    .select()
    .from(schema.spendEntries)
    .where(eq(schema.spendEntries.userId, userId));

  return {
    user_settings: settings.map((r) => ({
      id: r.id,
      user_id: r.userId,
      check_in_rhythm: r.checkInRhythm,
      check_in_time: r.checkInTime,
      haptics: Boolean(r.haptics),
      reduce_motion: Boolean(r.reduceMotion),
      onboarding_complete: Boolean(r.onboardingComplete),
      updated_at: r.updatedAt,
    })),
    wants: wants.map((r) => ({
      id: r.id,
      user_id: r.userId,
      name: r.name,
      category: r.category,
      frequency_type: r.frequencyType,
      frequency_target: r.frequencyTarget,
      minimum_bar: r.minimumBar,
      status: r.status,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
    day_logs: dayLogs.map((r) => ({
      id: r.id,
      user_id: r.userId,
      local_date: r.localDate,
      unusual_note: r.unusualNote,
      completed_at: r.completedAt,
      device_id: r.deviceId,
      sync_status: r.syncStatus,
      updated_at: r.updatedAt,
    })),
    mood_entries: moods.map((r) => ({
      id: r.id,
      user_id: r.userId,
      day_log_id: r.dayLogId,
      is_canonical: Boolean(r.isCanonical),
      valence: r.valence,
      label: r.label,
      justification: r.justification,
      cue_tags: parseCueTags(r.cueTags),
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
    habit_entries: habits.map((r) => ({
      id: r.id,
      user_id: r.userId,
      day_log_id: r.dayLogId,
      want_id: r.wantId,
      status: r.status,
      cue_tags: parseCueTags(r.cueTags),
      note: r.note,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
    spend_entries: spends.map((r) => ({
      id: r.id,
      user_id: r.userId,
      day_log_id: r.dayLogId,
      amount_exact: r.amountExact,
      amount_band: r.amountBand,
      category: r.category,
      scenario: r.scenario,
      note: r.note,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
  };
}

/** Apply remote row with LWW on updated_at */
export async function applyRemoteRow(
  db: AppDatabase,
  table: SyncTable,
  row: TableRow
): Promise<void> {
  const updatedAt = String(row.updated_at);

  switch (table) {
    case "user_settings": {
      const existing = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        checkInRhythm: String(row.check_in_rhythm),
        checkInTime: row.check_in_time ? String(row.check_in_time) : null,
        haptics: Boolean(row.haptics),
        reduceMotion: Boolean(row.reduce_motion),
        onboardingComplete: Boolean(row.onboarding_complete),
        updatedAt,
      };
      if (existing[0]) {
        await db
          .update(schema.userSettings)
          .set(values)
          .where(eq(schema.userSettings.id, values.id));
      } else {
        await db.insert(schema.userSettings).values(values);
      }
      break;
    }
    case "wants": {
      const existing = await db
        .select()
        .from(schema.wants)
        .where(eq(schema.wants.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        name: String(row.name),
        category: String(row.category),
        frequencyType: String(row.frequency_type),
        frequencyTarget: Number(row.frequency_target),
        minimumBar: row.minimum_bar ? String(row.minimum_bar) : null,
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt,
      };
      if (existing[0]) {
        await db.update(schema.wants).set(values).where(eq(schema.wants.id, values.id));
      } else {
        await db.insert(schema.wants).values(values);
      }
      break;
    }
    case "day_logs": {
      const existing = await db
        .select()
        .from(schema.dayLogs)
        .where(eq(schema.dayLogs.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        localDate: String(row.local_date),
        unusualNote: row.unusual_note ? String(row.unusual_note) : null,
        completedAt: row.completed_at ? String(row.completed_at) : null,
        deviceId: row.device_id ? String(row.device_id) : null,
        syncStatus: "synced" as const,
        updatedAt,
      };
      if (existing[0]) {
        await db.update(schema.dayLogs).set(values).where(eq(schema.dayLogs.id, values.id));
      } else {
        await db.insert(schema.dayLogs).values(values);
      }
      break;
    }
    case "mood_entries": {
      const existing = await db
        .select()
        .from(schema.moodEntries)
        .where(eq(schema.moodEntries.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        dayLogId: String(row.day_log_id),
        isCanonical: Boolean(row.is_canonical),
        valence: Number(row.valence),
        label: row.label ? String(row.label) : null,
        justification: row.justification ? String(row.justification) : null,
        cueTags: JSON.stringify(parseCueTags(row.cue_tags)),
        createdAt: String(row.created_at),
        updatedAt,
      };
      if (existing[0]) {
        await db
          .update(schema.moodEntries)
          .set(values)
          .where(eq(schema.moodEntries.id, values.id));
      } else {
        await db.insert(schema.moodEntries).values(values);
      }
      break;
    }
    case "habit_entries": {
      const existing = await db
        .select()
        .from(schema.habitEntries)
        .where(eq(schema.habitEntries.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        dayLogId: String(row.day_log_id),
        wantId: String(row.want_id),
        status: String(row.status),
        cueTags: JSON.stringify(parseCueTags(row.cue_tags)),
        note: row.note ? String(row.note) : null,
        createdAt: String(row.created_at),
        updatedAt,
      };
      if (existing[0]) {
        await db
          .update(schema.habitEntries)
          .set(values)
          .where(eq(schema.habitEntries.id, values.id));
      } else {
        await db.insert(schema.habitEntries).values(values);
      }
      break;
    }
    case "spend_entries": {
      const existing = await db
        .select()
        .from(schema.spendEntries)
        .where(eq(schema.spendEntries.id, String(row.id)))
        .limit(1);
      if (existing[0] && existing[0].updatedAt >= updatedAt) return;
      const values = {
        id: String(row.id),
        userId: String(row.user_id),
        dayLogId: String(row.day_log_id),
        amountExact: row.amount_exact != null ? Number(row.amount_exact) : null,
        amountBand: String(row.amount_band),
        category: String(row.category),
        scenario: String(row.scenario),
        note: row.note ? String(row.note) : null,
        createdAt: String(row.created_at),
        updatedAt,
      };
      if (existing[0]) {
        await db
          .update(schema.spendEntries)
          .set(values)
          .where(eq(schema.spendEntries.id, values.id));
      } else {
        await db.insert(schema.spendEntries).values(values);
      }
      break;
    }
  }
}

export async function markAllSynced(db: AppDatabase, userId: string): Promise<void> {
  await db
    .update(schema.dayLogs)
    .set({ syncStatus: "synced" })
    .where(eq(schema.dayLogs.userId, userId));
}
