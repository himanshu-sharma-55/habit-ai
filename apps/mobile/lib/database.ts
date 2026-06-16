import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { MIGRATION_SQL, MIGRATION_V2_SQL, type AppDatabase } from "@habit-ai/db";
import * as schema from "@habit-ai/db/schema";

const sqlite: SQLiteDatabase = openDatabaseSync("habit-ai.db");
const db = drizzle(sqlite, { schema });
let initialized = false;

async function runMigrations() {
  await sqlite.execAsync(MIGRATION_SQL);
  for (const statement of MIGRATION_V2_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await sqlite.execAsync(statement);
    } catch {
      /* column already exists */
    }
  }
}

export function getDatabase(): AppDatabase {
  return db as unknown as AppDatabase;
}

export async function initDatabase(): Promise<AppDatabase> {
  if (!initialized) {
    await runMigrations();
    initialized = true;
  }
  return db as unknown as AppDatabase;
}
