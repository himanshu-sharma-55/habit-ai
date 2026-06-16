-- Habit AI initial schema (Supabase / Postgres mirror of local SQLite)

create table if not exists user_settings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_rhythm text not null default 'daily',
  check_in_time text default '21:00',
  haptics boolean not null default true,
  reduce_motion boolean not null default false,
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists wants (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  frequency_type text not null,
  frequency_target integer not null,
  minimum_bar text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists day_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  unusual_note text,
  completed_at timestamptz,
  device_id text,
  sync_status text not null default 'pending',
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create table if not exists mood_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_log_id uuid not null references day_logs(id) on delete cascade,
  is_canonical boolean not null default true,
  valence integer not null,
  label text,
  justification text,
  cue_tags jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habit_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_log_id uuid not null references day_logs(id) on delete cascade,
  want_id uuid not null references wants(id) on delete cascade,
  status text not null,
  cue_tags jsonb default '[]',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_log_id, want_id)
);

create table if not exists spend_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_log_id uuid not null references day_logs(id) on delete cascade,
  amount_exact integer,
  amount_band text not null,
  category text not null,
  scenario text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table user_settings enable row level security;
alter table wants enable row level security;
alter table day_logs enable row level security;
alter table mood_entries enable row level security;
alter table habit_entries enable row level security;
alter table spend_entries enable row level security;

create policy "user_settings_own" on user_settings for all using (auth.uid() = user_id);
create policy "wants_own" on wants for all using (auth.uid() = user_id);
create policy "day_logs_own" on day_logs for all using (auth.uid() = user_id);
create policy "mood_entries_own" on mood_entries for all using (auth.uid() = user_id);
create policy "habit_entries_own" on habit_entries for all using (auth.uid() = user_id);
create policy "spend_entries_own" on spend_entries for all using (auth.uid() = user_id);

-- Indexes
create index if not exists day_logs_user_date_idx on day_logs(user_id, local_date);
create index if not exists habit_entries_want_idx on habit_entries(want_id);
create index if not exists mood_entries_day_idx on mood_entries(day_log_id);
