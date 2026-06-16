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
  CLOUD_SYNC_ENABLED,
  completeCheckIn as completeCheckInRepo,
  completeOnboarding as completeOnboardingRepo,
  deleteSpend as deleteSpendRepo,
  getActiveWants,
  getAllWantProgress,
  getDayLogWithEntries,
  getMissedYesterday,
  getPausedWants,
  getSavedHearings,
  getSettings,
  getTimeline,
  pauseWant as pauseWantRepo,
  addCustomWant as addCustomWantRepo,
  resumeWant as resumeWantRepo,
  updateWant as updateWantRepo,
  saveDayContext as saveDayContextRepo,
  saveHabit as saveHabitRepo,
  saveHearing as saveHearingRepo,
  saveMood as saveMoodRepo,
  saveSpend as saveSpendRepo,
  saveUnusualNote as saveUnusualNoteRepo,
  updateSettings as updateSettingsRepo,
  type CheckInRhythm,
  type HearingEvidence,
  type HearingRange,
} from "@habit-ai/db";
import { LoadingScreen } from "@/components/ui";
import { initDatabase } from "./database";

type AppContextValue = {
  ready: boolean;
  db: AppDatabase | null;
  refresh: () => Promise<void>;
  settings: Awaited<ReturnType<typeof getSettings>> | null;
  wants: Awaited<ReturnType<typeof getActiveWants>>;
  wantProgress: Awaited<ReturnType<typeof getAllWantProgress>>;
  timeline: Awaited<ReturnType<typeof getTimeline>>;
  missedYesterday: string | null;
  savedHearings: Awaited<ReturnType<typeof getSavedHearings>>;
  pausedWants: Awaited<ReturnType<typeof getPausedWants>>;
  completeOnboarding: (
    templateIds: string[],
    rhythm: CheckInRhythm,
    checkInTime?: string
  ) => Promise<void>;
  loadDay: (localDate: string) => ReturnType<typeof getDayLogWithEntries>;
  saveMoodEntry: (
    input: Parameters<typeof saveMoodRepo>[1]
  ) => ReturnType<typeof saveMoodRepo>;
  saveHabitEntry: (
    input: Parameters<typeof saveHabitRepo>[1]
  ) => ReturnType<typeof saveHabitRepo>;
  saveSpendEntry: (
    input: Parameters<typeof saveSpendRepo>[1]
  ) => ReturnType<typeof saveSpendRepo>;
  removeSpendEntry: (spendId: string) => Promise<void>;
  setUnusualNote: (localDate: string, note: string | null) => Promise<void>;
  finishCheckIn: (localDate: string) => Promise<void>;
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
  pauseWant: (wantId: string) => Promise<void>;
  addCustomWant: (
    input: Parameters<typeof addCustomWantRepo>[1]
  ) => Promise<void>;
  resumeWant: (wantId: string) => Promise<void>;
  updateWant: (
    wantId: string,
    input: Parameters<typeof updateWantRepo>[2]
  ) => Promise<void>;
  saveDayContext: (
    localDate: string,
    input: Parameters<typeof saveDayContextRepo>[2]
  ) => Promise<void>;
  updateSettings: (
    input: Parameters<typeof updateSettingsRepo>[1]
  ) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [settings, setSettings] = useState<AppContextValue["settings"]>(null);
  const [wants, setWants] = useState<AppContextValue["wants"]>([]);
  const [wantProgress, setWantProgress] = useState<
    AppContextValue["wantProgress"]
  >([]);
  const [timeline, setTimeline] = useState<AppContextValue["timeline"]>([]);
  const [missedYesterday, setMissedYesterday] = useState<string | null>(null);
  const [savedHearings, setSavedHearings] = useState<
    AppContextValue["savedHearings"]
  >([]);
  const [pausedWants, setPausedWants] = useState<
    AppContextValue["pausedWants"]
  >([]);

  const refresh = useCallback(async () => {
    if (!db) return;
    const [s, w, p, t, m, h, paused] = await Promise.all([
      getSettings(db),
      getActiveWants(db),
      getAllWantProgress(db),
      getTimeline(db),
      getMissedYesterday(db),
      getSavedHearings(db),
      getPausedWants(db),
    ]);
    setSettings(s);
    setWants(w);
    setWantProgress(p);
    setTimeline(t);
    setMissedYesterday(m);
    setSavedHearings(h);
    setPausedWants(paused);
  }, [db]);

  const refreshCheckIn = useCallback(async () => {
    if (!db) return;
    const [p, m] = await Promise.all([
      getAllWantProgress(db),
      getMissedYesterday(db),
    ]);
    setWantProgress(p);
    setMissedYesterday(m);
  }, [db]);

  const afterWrite = useCallback(
    async (action: () => Promise<void>) => {
      await action();
      await refresh();
    },
    [refresh]
  );

  const afterWriteCheckIn = useCallback(
    async (action: () => Promise<void>) => {
      await action();
      await refreshCheckIn();
    },
    [refreshCheckIn]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const database = await initDatabase();
      if (!mounted) return;
      setDb(database);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (ready && db) refresh();
  }, [ready, db, refresh]);

  // Cloud sync code remains in packages/sync — disabled via CLOUD_SYNC_ENABLED
  void CLOUD_SYNC_ENABLED;

  const loadDay = useCallback(
    (localDate: string) => {
      if (!db) throw new Error("DB not ready");
      return getDayLogWithEntries(db, localDate);
    },
    [db]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      db,
      refresh,
      settings,
      wants,
      wantProgress,
      timeline,
      missedYesterday,
      savedHearings,
      pausedWants,
      completeOnboarding: async (templateIds, rhythm, checkInTime) => {
        if (!db) return;
        await afterWrite(async () => {
          await completeOnboardingRepo(db, { templateIds, rhythm, checkInTime });
        });
      },
      loadDay,
      saveMoodEntry: async (input) => {
        if (!db) throw new Error("DB not ready");
        let result: Awaited<ReturnType<typeof saveMoodRepo>>;
        await afterWriteCheckIn(async () => {
          result = await saveMoodRepo(db, input);
        });
        return result!;
      },
      saveHabitEntry: async (input) => {
        if (!db) throw new Error("DB not ready");
        let result: Awaited<ReturnType<typeof saveHabitRepo>>;
        await afterWriteCheckIn(async () => {
          result = await saveHabitRepo(db, input);
        });
        return result!;
      },
      saveSpendEntry: async (input) => {
        if (!db) throw new Error("DB not ready");
        let result: Awaited<ReturnType<typeof saveSpendRepo>>;
        await afterWriteCheckIn(async () => {
          result = await saveSpendRepo(db, input);
        });
        return result!;
      },
      removeSpendEntry: async (spendId) => {
        if (!db) return;
        await afterWriteCheckIn(async () => {
          await deleteSpendRepo(db, spendId);
        });
      },
      setUnusualNote: async (localDate, note) => {
        if (!db) return;
        await afterWriteCheckIn(async () => {
          await saveUnusualNoteRepo(db, localDate, note);
        });
      },
      finishCheckIn: async (localDate) => {
        if (!db) return;
        await afterWriteCheckIn(async () => {
          await completeCheckInRepo(db, localDate);
        });
      },
      runHearing: async (input) => {
        if (!db) throw new Error("DB not ready");
        return buildHearingEvidence(db, input);
      },
      saveHearingRuling: async (evidence, ruling, note) => {
        if (!db) return;
        await afterWrite(async () => {
          await saveHearingRepo(db, {
            question: evidence.question,
            wantId: evidence.wantId,
            rangeStart: evidence.rangeStart,
            rangeEnd: evidence.rangeEnd,
            ruling,
            note,
          });
        });
      },
      pauseWant: async (wantId) => {
        if (!db) return;
        await afterWrite(async () => {
          await pauseWantRepo(db, wantId);
        });
      },
      addCustomWant: async (input) => {
        if (!db) return;
        await afterWrite(async () => {
          await addCustomWantRepo(db, input);
        });
      },
      resumeWant: async (wantId) => {
        if (!db) return;
        await afterWrite(async () => {
          await resumeWantRepo(db, wantId);
        });
      },
      updateWant: async (wantId, input) => {
        if (!db) return;
        await afterWrite(async () => {
          await updateWantRepo(db, wantId, input);
        });
      },
      saveDayContext: async (localDate, input) => {
        if (!db) return;
        await afterWriteCheckIn(async () => {
          await saveDayContextRepo(db, localDate, input);
        });
      },
      updateSettings: async (input) => {
        if (!db) return;
        await afterWrite(async () => {
          await updateSettingsRepo(db, input);
        });
      },
    }),
    [
      ready,
      db,
      refresh,
      settings,
      wants,
      wantProgress,
      timeline,
      missedYesterday,
      savedHearings,
      pausedWants,
      afterWrite,
      afterWriteCheckIn,
      loadDay,
    ]
  );

  if (!ready || !db) return <LoadingScreen />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
