import type { HabitStatus } from "@habit-ai/db";

export type StepKind = "life" | "want";

export type CheckInStep = {
  id: string;
  kind: StepKind;
  title: string;
  hint: string;
  optional?: boolean;
  wantId?: string;
  wantName?: string;
  wantCategory?: string;
  minimumBar?: string | null;
  frequencyLabel?: string;
};

export type DaySnapshot = {
  hasMood: boolean;
  sleepQuality: string | null;
  energyLevel: string | null;
  habitMap: Map<string, { status: HabitStatus; note?: string | null }>;
  hasSpend: boolean;
  contextCount: number;
  hasUnusual: boolean;
};

export function buildCheckInSteps(
  dailyWants: {
    id: string;
    name: string;
    category: string;
    minimumBar?: string | null;
    frequencyType: string;
    frequencyTarget: number;
  }[],
  weeklyWants: {
    id: string;
    name: string;
    category: string;
    minimumBar?: string | null;
    frequencyType: string;
    frequencyTarget: number;
  }[],
  weeklyProgress: Map<string, { actual: number; target: number }>
): CheckInStep[] {
  const steps: CheckInStep[] = [
    {
      id: "mood",
      kind: "life",
      title: "How do you feel?",
      hint: "Slide once — tap a word only if it helps.",
    },
    {
      id: "sleep",
      kind: "life",
      title: "How was sleep?",
      hint: "Rough signal for energy and mood later.",
    },
    {
      id: "energy",
      kind: "life",
      title: "Energy today?",
      hint: "Separate from mood — tired but okay counts.",
    },
  ];

  for (const want of dailyWants) {
    steps.push({
      id: `want-${want.id}`,
      kind: "want",
      title: want.name,
      hint:
        want.category === "food"
          ? "Your food want — mindfulness + sugar."
          : want.minimumBar ?? "Did you do it today?",
      wantId: want.id,
      wantName: want.name,
      wantCategory: want.category,
      minimumBar: want.minimumBar,
      frequencyLabel: "Daily want",
    });
  }

  for (const want of weeklyWants) {
    const p = weeklyProgress.get(want.id);
    steps.push({
      id: `want-${want.id}`,
      kind: "want",
      title: want.name,
      hint: want.minimumBar ?? "Log if you did it today.",
      wantId: want.id,
      wantName: want.name,
      wantCategory: want.category,
      minimumBar: want.minimumBar,
      frequencyLabel: `Weekly · ${p?.actual ?? 0}/${p?.target ?? want.frequencyTarget}`,
    });
  }

  steps.push(
    {
      id: "spend",
      kind: "life",
      title: "Any spending?",
      hint: "Optional — amount + what it was for.",
      optional: true,
    },
    {
      id: "context",
      kind: "life",
      title: "What surrounded you?",
      hint: "Optional — work, people, travel.",
      optional: true,
    },
    {
      id: "unusual",
      kind: "life",
      title: "Anything unusual?",
      hint: "Optional — one line if something stood out.",
      optional: true,
    },
    {
      id: "finish",
      kind: "life",
      title: "You're done",
      hint: "Save when this looks right. You can always edit later.",
    }
  );

  return steps;
}

export function isStepAnswered(step: CheckInStep, snap: DaySnapshot): boolean {
  if (step.id === "mood") return snap.hasMood;
  if (step.id === "sleep") return Boolean(snap.sleepQuality);
  if (step.id === "energy") return Boolean(snap.energyLevel);
  if (step.id === "spend") return snap.hasSpend;
  if (step.id === "context") return snap.contextCount > 0;
  if (step.id === "unusual") return snap.hasUnusual;
  if (step.id === "finish") return false;
  if (step.wantId) return snap.habitMap.has(step.wantId);
  return false;
}

export function pendingRequiredSteps(
  steps: CheckInStep[],
  snap: DaySnapshot
): CheckInStep[] {
  return steps.filter(
    (s) => s.id !== "finish" && !s.optional && !isStepAnswered(s, snap)
  );
}
