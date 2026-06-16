import {
  pullRows,
  SYNC_TABLES,
  upsertRow,
  type SyncTable,
} from "./index";

export type SyncEngineDeps = {
  collectLocalRows: (
    userId: string
  ) => Promise<Record<SyncTable, Record<string, unknown>[]>>;
  applyRemoteRow: (
    table: SyncTable,
    row: Record<string, unknown>
  ) => Promise<void>;
  getWatermark: () => Promise<string>;
  setWatermark: (value: string) => Promise<void>;
  markSynced: (userId: string) => Promise<void>;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
  watermark: string;
};

export async function runSync(
  userId: string,
  deps: SyncEngineDeps
): Promise<SyncResult> {
  let pushed = 0;
  let pulled = 0;
  const since = await deps.getWatermark();

  const local = await deps.collectLocalRows(userId);
  for (const table of SYNC_TABLES) {
    const rows = local[table];
    for (const row of rows) {
      await upsertRow(table, {
        ...row,
        user_id: userId,
        updated_at: String(row.updated_at),
      } as Parameters<typeof upsertRow>[1]);
      pushed++;
    }
  }

  let latest = since;
  for (const table of SYNC_TABLES) {
    const remote = await pullRows(table, userId, since);
    for (const row of remote) {
      await deps.applyRemoteRow(table, row);
      pulled++;
      const rowUpdated = String(row.updated_at);
      if (rowUpdated > latest) latest = rowUpdated;
    }
  }

  const watermark = new Date().toISOString();
  await deps.setWatermark(latest > since ? latest : watermark);
  await deps.markSynced(userId);

  return { pushed, pulled, watermark: latest > since ? latest : watermark };
}
