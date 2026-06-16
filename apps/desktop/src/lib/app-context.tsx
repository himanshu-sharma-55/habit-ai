import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppDatabase } from "@habit-ai/db";
import {
  buildHearingEvidence,
  getActiveWants,
  getSavedHearings,
  saveHearing,
  type HearingEvidence,
  type HearingRange,
} from "@habit-ai/db";
import { isTauri } from "@tauri-apps/api/core";
import { initDatabase, persistDatabase, schedulePersist } from "./database";

type AppContextValue = {
  ready: boolean;
  storage: "tauri" | "memory";
  wants: Awaited<ReturnType<typeof getActiveWants>>;
  savedHearings: Awaited<ReturnType<typeof getSavedHearings>>;
  runHearing: (input: {
    question: string;
    wantId?: string;
    rangeDays: HearingRange;
  }) => Promise<HearingEvidence>;
  saveHearingRuling: (
    evidence: HearingEvidence,
    ruling: string,
    note?: string
  ) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [wants, setWants] = useState<AppContextValue["wants"]>([]);
  const [savedHearings, setSavedHearings] = useState<
    AppContextValue["savedHearings"]
  >([]);
  const [initError, setInitError] = useState<string | null>(null);
  const storage = isTauri() ? "tauri" : "memory";

  const refresh = useCallback(async () => {
    if (!db) return;
    const [w, h] = await Promise.all([
      getActiveWants(db),
      getSavedHearings(db),
    ]);
    setWants(w);
    setSavedHearings(h);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const database = await initDatabase();
        if (cancelled) return;
        setDb(database);
        const [w, h] = await Promise.all([
          getActiveWants(database),
          getSavedHearings(database),
        ]);
        setWants(w);
        setSavedHearings(h);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setInitError(
          err instanceof Error ? err.message : "Failed to initialize database"
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const afterWrite = useCallback(
    async (fn: () => Promise<void>) => {
      if (!db) return;
      await fn();
      schedulePersist();
      await refresh();
    },
    [db, refresh]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      storage,
      wants,
      savedHearings,
      runHearing: async (input) => {
        if (!db) throw new Error("DB not ready");
        return buildHearingEvidence(db, input);
      },
      saveHearingRuling: async (evidence, ruling, note) => {
        if (!db) return;
        await afterWrite(async () => {
          await saveHearing(db, {
            question: evidence.question,
            wantId: evidence.wantId,
            rangeStart: evidence.rangeStart,
            rangeEnd: evidence.rangeEnd,
            ruling,
            note,
          });
        });
        await persistDatabase();
      },
    }),
    [afterWrite, db, ready, savedHearings, storage, wants]
  );

  if (initError) {
    return (
      <div style={loadingStyle}>
        <p>Could not load database</p>
        <p style={loadingHint}>{initError}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={loadingStyle}>
        <p>Loading local database…</p>
        {storage === "memory" ? (
          <p style={loadingHint}>
            Browser preview — data stays in memory until you run the Tauri app.
          </p>
        ) : null}
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "#0F1117",
  color: "#9AA3B2",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const loadingHint: React.CSSProperties = {
  fontSize: 13,
  maxWidth: 320,
  textAlign: "center",
  lineHeight: 1.5,
};
