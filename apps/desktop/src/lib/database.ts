import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { isTauri } from "@tauri-apps/api/core";
import {
  BaseDirectory,
  exists,
  readFile,
  writeFile,
} from "@tauri-apps/plugin-fs";
import {
  MIGRATION_SQL,
  MIGRATION_V2_SQL,
  type AppDatabase,
} from "@habit-ai/db";
import * as schema from "@habit-ai/db/schema";
import wasmUrl from "../../node_modules/sql.js/dist/sql-wasm-browser.wasm?url";
import { seedDemoIfEmpty } from "./seed-demo";

const DB_FILE = "habit-ai.db";

let sqlite: SqlJsDatabase | null = null;
let db: AppDatabase | null = null;
let initialized = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function runMigrations(database: SqlJsDatabase) {
  database.run(MIGRATION_SQL);
  for (const statement of MIGRATION_V2_SQL.split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    try {
      database.run(statement);
    } catch {
      /* column already exists */
    }
  }
}

async function loadBytes(): Promise<Uint8Array | null> {
  if (!isTauri()) return null;
  const hasDb = await exists(DB_FILE, { baseDir: BaseDirectory.AppData });
  if (!hasDb) return null;
  return readFile(DB_FILE, { baseDir: BaseDirectory.AppData });
}

async function writeBytes(bytes: Uint8Array) {
  if (!isTauri()) return;
  await writeFile(DB_FILE, bytes, { baseDir: BaseDirectory.AppData });
}

export function schedulePersist() {
  if (!sqlite || !isTauri()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void writeBytes(sqlite!.export());
  }, 300);
}

export async function persistDatabase() {
  if (!sqlite || !isTauri()) return;
  await writeBytes(sqlite.export());
}

export function getDatabase(): AppDatabase {
  if (!db) throw new Error("Database not initialized");
  return db;
}

let initPromise: Promise<AppDatabase> | null = null;

export async function initDatabase(): Promise<AppDatabase> {
  if (initialized && db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const existing = await loadBytes();
    sqlite = existing ? new SQL.Database(existing) : new SQL.Database();
    runMigrations(sqlite);

    db = drizzle(sqlite, { schema }) as unknown as AppDatabase;
    await seedDemoIfEmpty(db);
    await persistDatabase();

    initialized = true;
    return db;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}
