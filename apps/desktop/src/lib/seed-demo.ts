import {
  completeOnboarding,
  getActiveWants,
  getLocalDate,
  saveHabit,
  saveMood,
  saveSpend,
  type AppDatabase,
} from "@habit-ai/db";
import * as schema from "@habit-ai/db/schema";

function dateDaysAgo(localDate: string, days: number): string {
  const d = new Date(`${localDate}T12:00:00`);
  d.setDate(d.getDate() - days);
  return getLocalDate(d);
}

export async function seedDemoIfEmpty(db: AppDatabase) {
  const wants = await getActiveWants(db);
  if (wants.length === 0) {
    await completeOnboarding(db, {
      templateIds: ["reading", "workout"],
      rhythm: "daily",
    });
  }

  const [existingDay] = await db.select().from(schema.dayLogs).limit(1);
  if (existingDay) return;

  const activeWants = await getActiveWants(db);
  const reading = activeWants.find((w) => w.name === "Reading");
  const workout = activeWants.find((w) => w.name === "Workout");
  const today = getLocalDate();

  for (let i = 0; i < 21; i++) {
    const localDate = dateDaysAgo(today, i);
    const valence = i % 5 === 0 ? 2 : i % 3 === 0 ? 3 : 4;

    await saveMood(db, {
      localDate,
      valence,
      label: valence <= 2 ? "tired" : "okay",
      cueTags: valence <= 2 ? ["work_stress"] : [],
    });

    if (reading) {
      const status =
        i < 5 ? "done" : i < 12 ? "skipped" : i % 4 === 0 ? "light" : "skipped";
      await saveHabit(db, {
        localDate,
        wantId: reading.id,
        status,
        cueTags: status === "skipped" ? ["tired", "no_time"] : [],
      });
    }

    if (workout && i % 2 === 0) {
      await saveHabit(db, {
        localDate,
        wantId: workout.id,
        status: i < 10 ? "done" : "skipped",
      });
    }

    if (valence <= 2 && i % 3 === 0) {
      await saveSpend(db, {
        localDate,
        amountBand: "small",
        category: "delivery",
        scenario: "impulse",
      });
    }
  }
}
