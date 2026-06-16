import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  checkInRhythm: text("check_in_rhythm").notNull().default("daily"),
  checkInTime: text("check_in_time").default("21:00"),
  haptics: integer("haptics", { mode: "boolean" }).notNull().default(true),
  reduceMotion: integer("reduce_motion", { mode: "boolean" })
    .notNull()
    .default(false),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" })
    .notNull()
    .default(false),
  updatedAt: text("updated_at").notNull(),
});

export const wants = sqliteTable("wants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  frequencyType: text("frequency_type").notNull(),
  frequencyTarget: integer("frequency_target").notNull(),
  minimumBar: text("minimum_bar"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const dayLogs = sqliteTable("day_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  localDate: text("local_date").notNull(),
  unusualNote: text("unusual_note"),
  sleepQuality: text("sleep_quality"),
  energyLevel: text("energy_level"),
  contextTags: text("context_tags"),
  completedAt: text("completed_at"),
  deviceId: text("device_id"),
  syncStatus: text("sync_status").notNull().default("pending"),
  updatedAt: text("updated_at").notNull(),
});

export const moodEntries = sqliteTable("mood_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  dayLogId: text("day_log_id").notNull(),
  isCanonical: integer("is_canonical", { mode: "boolean" })
    .notNull()
    .default(true),
  valence: integer("valence").notNull(),
  label: text("label"),
  justification: text("justification"),
  cueTags: text("cue_tags"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const habitEntries = sqliteTable("habit_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  dayLogId: text("day_log_id").notNull(),
  wantId: text("want_id").notNull(),
  status: text("status").notNull(),
  cueTags: text("cue_tags"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const spendEntries = sqliteTable("spend_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  dayLogId: text("day_log_id").notNull(),
  amountExact: integer("amount_exact"),
  amountBand: text("amount_band").notNull(),
  category: text("category").notNull(),
  scenario: text("scenario").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const syncMeta = sqliteTable("sync_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const hearings = sqliteTable("hearings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  question: text("question").notNull(),
  wantId: text("want_id"),
  rangeStart: text("range_start").notNull(),
  rangeEnd: text("range_end").notNull(),
  ruling: text("ruling"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});
