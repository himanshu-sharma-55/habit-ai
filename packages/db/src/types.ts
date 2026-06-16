export type WantCategory =
  | "fitness"
  | "reading"
  | "food"
  | "mood"
  | "spend"
  | "custom";

export type FrequencyType = "daily" | "weekly";

export type WantStatus = "active" | "paused" | "archived";

export type HabitStatus = "done" | "skipped" | "light" | "not_applicable";

export type AmountBand = "small" | "medium" | "large";

export type SpendCategory =
  | "food"
  | "delivery"
  | "eating_out"
  | "coffee"
  | "shopping"
  | "subscription"
  | "other";

export type SpendScenario =
  | "planned"
  | "impulse"
  | "stress"
  | "social"
  | "reward"
  | "boredom";

export type CheckInRhythm = "daily" | "alternate" | "manual";

export function asCheckInRhythm(value: string | null | undefined): CheckInRhythm {
  if (value === "alternate" || value === "manual") return value;
  return "daily";
}

export type SyncStatus = "pending" | "synced";

export const LOCAL_USER_ID = "local-user";

export const WANT_TEMPLATES = [
  {
    id: "workout",
    name: "Workout",
    category: "fitness" as WantCategory,
    frequencyType: "weekly" as FrequencyType,
    frequencyTarget: 3,
    minimumBar: "Any movement counts",
  },
  {
    id: "reading",
    name: "Reading",
    category: "reading" as WantCategory,
    frequencyType: "weekly" as FrequencyType,
    frequencyTarget: 4,
    minimumBar: "20 min counts",
  },
  {
    id: "mood",
    name: "Mood",
    category: "mood" as WantCategory,
    frequencyType: "daily" as FrequencyType,
    frequencyTarget: 1,
    minimumBar: undefined,
  },
  {
    id: "food",
    name: "Food awareness",
    category: "food" as WantCategory,
    frequencyType: "daily" as FrequencyType,
    frequencyTarget: 1,
    minimumBar: undefined,
  },
  {
    id: "spending",
    name: "Spending",
    category: "spend" as WantCategory,
    frequencyType: "daily" as FrequencyType,
    frequencyTarget: 1,
    minimumBar: undefined,
  },
] as const;

/** Wants tracked as habits — mood and spend use dedicated Today UI instead. */
export function isHabitWant(category: string) {
  return category !== "mood" && category !== "spend";
}

export const HABIT_WANT_TEMPLATES = WANT_TEMPLATES.filter((t) =>
  isHabitWant(t.category)
);

export const HABIT_CUE_TAGS = [
  "stress",
  "tired",
  "no_time",
  "forgot",
  "people",
  "environment",
  "sleep",
  "work",
] as const;

export const SLEEP_OPTIONS = ["poor", "ok", "good"] as const;
export type SleepQuality = (typeof SLEEP_OPTIONS)[number];

export const ENERGY_OPTIONS = ["low", "medium", "high"] as const;
export type EnergyLevel = (typeof ENERGY_OPTIONS)[number];

export const DAY_CONTEXT_TAGS = [
  "work",
  "deadline",
  "travel",
  "social",
  "home",
  "sick",
  "alone",
] as const;

export const SUGAR_OPTIONS = ["none", "low", "medium", "high"] as const;

export const FOOD_AWARENESS_OPTIONS = ["Low", "Medium", "High"] as const;

export const SPEND_CATEGORY_OPTIONS = [
  "food",
  "delivery",
  "eating_out",
  "coffee",
  "shopping",
  "subscription",
  "other",
] as const;

export const SPEND_SCENARIO_OPTIONS = [
  "planned",
  "impulse",
  "stress",
  "social",
  "reward",
  "boredom",
] as const;

const CUE_TAG_LABELS: Record<string, string> = {
  stress: "Stress",
  tired: "Tired",
  no_time: "No time",
  forgot: "Forgot",
  people: "People",
  environment: "Environment",
  work: "Work",
  drained: "Drained",
  sleep: "Sleep",
};

export function formatCueTag(tag: string): string {
  return CUE_TAG_LABELS[tag] ?? tag.replace(/_/g, " ");
}

const SPEND_LABELS: Record<string, string> = {
  food: "Food",
  delivery: "Delivery",
  eating_out: "Eating out",
  coffee: "Coffee",
  shopping: "Shopping",
  subscription: "Subscription",
  other: "Other",
  planned: "Planned",
  impulse: "Impulse",
  stress: "Stress",
  social: "Social",
  reward: "Reward",
  boredom: "Boredom",
  small: "Small",
  medium: "Medium",
  large: "Large",
  poor: "Poor",
  ok: "OK",
  good: "Good",
  low: "Low",
  high: "High",
  none: "None",
  deadline: "Deadline",
  travel: "Travel",
  home: "Home",
  sick: "Sick",
  alone: "Alone",
};

export function formatOptionLabel(key: string): string {
  return (
    SPEND_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export type FoodNote = {
  awareness: string;
  sugar?: string;
};

export function parseFoodNote(raw: string | null | undefined): FoodNote | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FoodNote;
    if (parsed.awareness) return parsed;
  } catch {
    /* legacy plain string */
  }
  return { awareness: raw };
}

export function serializeFoodNote(note: FoodNote): string {
  return JSON.stringify(note);
}

export function formatFoodNote(raw: string | null | undefined): string {
  const parsed = parseFoodNote(raw);
  if (!parsed) return "Not logged";
  const parts = [parsed.awareness];
  if (parsed.sugar) parts.push(`Sugar: ${formatOptionLabel(parsed.sugar)}`);
  return parts.join(" · ");
}

export type HabitDisplay = {
  headline: string;
  detail?: string;
  tone: "success" | "danger" | "neutral" | "warning";
};

export function formatHabitDisplay(
  category: string,
  status: string,
  note: string | null | undefined,
  cueTags: string | null | undefined
): HabitDisplay {
  const cues = (() => {
    if (!cueTags) return "";
    try {
      return (JSON.parse(cueTags) as string[]).map(formatCueTag).join(", ");
    } catch {
      return "";
    }
  })();
  if (category === "food") {
    const food = parseFoodNote(note);
    if (!food) {
      return { headline: "Not logged", tone: "neutral" };
    }
    return {
      headline: food.awareness,
      detail: food.sugar
        ? `Sugar: ${formatOptionLabel(food.sugar)}`
        : undefined,
      tone:
        food.awareness === "High"
          ? "success"
          : food.awareness === "Low"
            ? "warning"
            : "neutral",
    };
  }
  if (status === "done") {
    return { headline: "Done", tone: "success" };
  }
  if (status === "skipped") {
    return {
      headline: "Skipped",
      detail: cues || undefined,
      tone: "danger",
    };
  }
  if (status === "light") {
    return { headline: "Light day", tone: "warning" };
  }
  return { headline: "Not logged", tone: "neutral" };
}

export const MOOD_CUE_TAGS = [
  "work",
  "tired",
  "drained",
  "sleep",
  "people",
] as const;

export const MOOD_LABELS = [
  "calm",
  "energized",
  "drained",
  "anxious",
  "flat",
  "good",
] as const;

export function deriveAmountBand(
  amount: number,
  thresholds = { small: 300, medium: 1000 }
): AmountBand {
  if (amount <= thresholds.small) return "small";
  if (amount <= thresholds.medium) return "medium";
  return "large";
}

export function formatSpendAmount(
  amountExact: number | null | undefined,
  amountBand: string
): string {
  if (amountExact != null && amountExact > 0) {
    return `₹${amountExact.toLocaleString("en-IN")}`;
  }
  return formatOptionLabel(amountBand);
}

export function formatSpendSummary(entry: {
  amountExact?: number | null;
  amountBand: string;
  category: string;
}): string {
  return `${formatSpendAmount(entry.amountExact, entry.amountBand)} · ${formatOptionLabel(entry.category)}`;
}

export function getLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekStart(localDate: string): string {
  const date = new Date(`${localDate}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getLocalDate(date);
}
