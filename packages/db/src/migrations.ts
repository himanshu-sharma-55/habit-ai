export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  check_in_rhythm TEXT NOT NULL DEFAULT 'daily',
  check_in_time TEXT DEFAULT '21:00',
  haptics INTEGER NOT NULL DEFAULT 1,
  reduce_motion INTEGER NOT NULL DEFAULT 0,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wants (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  frequency_target INTEGER NOT NULL,
  minimum_bar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  unusual_note TEXT,
  completed_at TEXT,
  device_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS day_logs_user_date ON day_logs(user_id, local_date);

CREATE TABLE IF NOT EXISTS mood_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  day_log_id TEXT NOT NULL,
  is_canonical INTEGER NOT NULL DEFAULT 1,
  valence INTEGER NOT NULL,
  label TEXT,
  justification TEXT,
  cue_tags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  day_log_id TEXT NOT NULL,
  want_id TEXT NOT NULL,
  status TEXT NOT NULL,
  cue_tags TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS habit_entries_day_want ON habit_entries(day_log_id, want_id);

CREATE TABLE IF NOT EXISTS spend_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  day_log_id TEXT NOT NULL,
  amount_exact INTEGER,
  amount_band TEXT NOT NULL,
  category TEXT NOT NULL,
  scenario TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hearings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  want_id TEXT,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  ruling TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
`;

/** Run after MIGRATION_SQL — safe to re-run (ignores duplicate column). */
export const MIGRATION_V2_SQL = `
ALTER TABLE day_logs ADD COLUMN sleep_quality TEXT;
ALTER TABLE day_logs ADD COLUMN energy_level TEXT;
ALTER TABLE day_logs ADD COLUMN context_tags TEXT;
`;
