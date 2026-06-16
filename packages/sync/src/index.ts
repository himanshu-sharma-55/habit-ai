import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";

export type SyncConfig = {
  url: string;
  anonKey: string;
  storage?: SupportedStorage;
};

export type SyncTable =
  | "user_settings"
  | "wants"
  | "day_logs"
  | "mood_entries"
  | "habit_entries"
  | "spend_entries";

export type SyncableRow = {
  id: string;
  user_id: string;
  updated_at: string;
  [key: string]: unknown;
};

let client: SupabaseClient | null = null;

export function initSupabase(config: SyncConfig): SupabaseClient {
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: config.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error("Supabase not initialized. Call initSupabase first.");
  }
  return client;
}

/** Last-write-wins upsert for a single row */
export async function upsertRow(
  table: SyncTable,
  row: SyncableRow
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
  if (error) throw error;
}

/** Pull rows updated after a watermark */
export async function pullRows(
  table: SyncTable,
  userId: string,
  since: string
): Promise<SyncableRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", since)
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SyncableRow[];
}

export const SYNC_TABLES: SyncTable[] = [
  "user_settings",
  "wants",
  "day_logs",
  "mood_entries",
  "habit_entries",
  "spend_entries",
];

export * from "./engine";
