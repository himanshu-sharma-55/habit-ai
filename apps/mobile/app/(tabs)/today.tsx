import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getLocalDate,
  formatCueTag,
  formatOptionLabel,
  HABIT_CUE_TAGS,
  isHabitWant,
  MOOD_LABELS,
  parseFoodNote,
  parseTags,
  serializeFoodNote,
  SLEEP_OPTIONS,
  ENERGY_OPTIONS,
  DAY_CONTEXT_TAGS,
  FOOD_AWARENESS_OPTIONS,
  SUGAR_OPTIONS,
  type HabitStatus,
} from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { PrimaryButton } from "@/components/chips";
import { KeyboardScroll } from "@/components/keyboard";
import {
  StepContent,
  stepInputStyles,
  TodaySection,
  WizardProgress,
} from "@/components/check-in-wizard";
import { MultiSelectField, SelectField } from "@/components/select-field";
import {
  buildCheckInSteps,
  isStepAnswered,
  pendingRequiredSteps,
  type DaySnapshot,
} from "@/lib/check-in-steps";
import { MoodSlider } from "@/components/mood-slider";
import { SpendCapture } from "@/components/spend-form";
import { Screen } from "@/components/ui";
import { useApp } from "@/lib/app-context";

type DayData = Awaited<ReturnType<ReturnType<typeof useApp>["loadDay"]>>;

export default function TodayScreen() {
  const router = useRouter();
  const {
    wants,
    wantProgress,
    loadDay,
    saveMoodEntry,
    saveHabitEntry,
    saveSpendEntry,
    removeSpendEntry,
    setUnusualNote,
    saveDayContext,
    finishCheckIn,
    settings,
  } = useApp();

  const [activeDate] = useState(getLocalDate());
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [mood, setMood] = useState(3);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [moodJustification, setMoodJustification] = useState("");
  const [moodCues, setMoodCues] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [unusual, setUnusual] = useState("");
  const [skipModal, setSkipModal] = useState<{
    wantId: string;
    wantName: string;
  } | null>(null);
  const [selectedCues, setSelectedCues] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const dailyWants = useMemo(
    () =>
      wants.filter(
        (w) => w.frequencyType === "daily" && isHabitWant(w.category)
      ),
    [wants]
  );

  const weeklyWants = useMemo(
    () =>
      wants.filter(
        (w) => w.frequencyType === "weekly" && isHabitWant(w.category)
      ),
    [wants]
  );

  const weeklyProgressMap = useMemo(() => {
    const map = new Map<string, { actual: number; target: number }>();
    wantProgress.forEach((p) =>
      map.set(p.want.id, { actual: p.actual, target: p.target })
    );
    return map;
  }, [wantProgress]);

  const steps = useMemo(
    () => buildCheckInSteps(dailyWants, weeklyWants, weeklyProgressMap),
    [dailyWants, weeklyWants, weeklyProgressMap]
  );

  const wantSteps = useMemo(
    () => steps.filter((s) => s.kind === "want" && s.wantId),
    [steps]
  );

  const habitMap = useMemo(() => {
    const map = new Map<string, NonNullable<DayData>["habits"][number]>();
    dayData?.habits.forEach((h) => map.set(h.wantId, h));
    return map;
  }, [dayData]);

  const snapshot = useMemo<DaySnapshot>(
    () => ({
      hasMood: Boolean(dayData?.canonicalMood),
      sleepQuality,
      energyLevel,
      habitMap: new Map(
        Array.from(habitMap.entries()).map(([id, h]) => [
          id,
          { status: h.status as HabitStatus, note: h.note },
        ])
      ),
      hasSpend: Boolean(dayData?.spends.length),
      contextCount: contextTags.length,
      hasUnusual: Boolean(unusual.trim()),
    }),
    [dayData, sleepQuality, energyLevel, habitMap, contextTags, unusual]
  );

  const pending = useMemo(
    () => pendingRequiredSteps(steps, snapshot),
    [steps, snapshot]
  );

  const requiredSteps = useMemo(
    () => steps.filter((s) => s.id !== "finish" && !s.optional),
    [steps]
  );

  const answeredRequired = useMemo(
    () => requiredSteps.filter((s) => isStepAnswered(s, snapshot)).length,
    [requiredSteps, snapshot]
  );

  const reload = useCallback(async () => {
    const data = await loadDay(activeDate);
    setDayData(data);
    if (data.canonicalMood) {
      setMood(data.canonicalMood.valence);
      setMoodLabel(data.canonicalMood.label);
      setMoodJustification(data.canonicalMood.justification ?? "");
      setMoodCues(parseTags(data.canonicalMood.cueTags));
    }
    setSleepQuality(data.dayLog.sleepQuality ?? null);
    setEnergyLevel(data.dayLog.energyLevel ?? null);
    setContextTags(parseTags(data.dayLog.contextTags));
    setUnusual(data.dayLog.unusualNote ?? "");
    return data;
  }, [activeDate, loadDay]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resolvedMoodLabel = moodLabel ?? undefined;

  const saveMoodDetails = async (labelOverride?: string | null) => {
    const label =
      labelOverride !== undefined
        ? labelOverride ?? undefined
        : resolvedMoodLabel;
    const saved = await saveMoodEntry({
      localDate: activeDate,
      valence: mood,
      label,
      justification: moodJustification || undefined,
      cueTags: moodCues,
    });
    setDayData((d) => (d ? { ...d, canonicalMood: saved } : d));
  };

  const markHabit = useCallback(
    async (wantId: string, status: HabitStatus, cues: string[] = []) => {
      if (settings?.haptics) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const entry = await saveHabitEntry({
        localDate: activeDate,
        wantId,
        status,
        cueTags: cues,
      });
      setDayData((d) => {
        if (!d) return d;
        const habits = d.habits.filter((h) => h.wantId !== wantId);
        habits.push(entry);
        return { ...d, habits };
      });
    },
    [activeDate, saveHabitEntry, settings?.haptics]
  );

  const handleFoodLevel = async (
    wantId: string,
    awareness: string,
    sugar?: string
  ) => {
    const entry = await saveHabitEntry({
      localDate: activeDate,
      wantId,
      status: "done",
      note: serializeFoodNote({ awareness, sugar }),
    });
    setDayData((d) => {
      if (!d) return d;
      const habits = d.habits.filter((h) => h.wantId !== wantId);
      habits.push(entry);
      return { ...d, habits };
    });
  };

  const openSkip = (wantId: string, wantName: string) => {
    setSelectedCues([]);
    setSkipModal({ wantId, wantName });
  };

  const confirmSkip = async () => {
    if (!skipModal) return;
    await markHabit(skipModal.wantId, "skipped", selectedCues);
    setSkipModal(null);
    setSelectedCues([]);
  };

  const saveDay = async () => {
    await saveMoodDetails();
    await saveDayContext(activeDate, {
      sleepQuality,
      energyLevel,
      contextTags,
    });
    await setUnusualNote(activeDate, unusual.trim() || null);
    await finishCheckIn(activeDate);
    await reload();
    if (settings?.haptics) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const isComplete = dayData?.dayLog.completedAt != null;

  return (
    <Screen scroll>
      <KeyboardScroll
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: spacing.xl + insets.bottom + 72 },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push(`/day/${activeDate}`)}
            style={styles.dateRow}
          >
            <Text style={styles.dateText}>{activeDate}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </Pressable>
          <WizardProgress
            compact
            label=""
            done={answeredRequired}
            total={requiredSteps.length}
          />
        </View>

        {pending.length > 0 ? (
          <Text style={styles.pendingHint}>
            {pending.length} left — fill any section below, in any order.
          </Text>
        ) : (
          <Text style={styles.doneHint}>
            {isComplete ? "Today is saved." : "All set — save when ready."}
          </Text>
        )}

        <TodaySection title="How do you feel?">
          <StepContent>
            <MoodSlider
              value={mood}
              onChange={async (v) => {
                setMood(v);
                const saved = await saveMoodEntry({
                  localDate: activeDate,
                  valence: v,
                  label: resolvedMoodLabel,
                  justification: moodJustification || undefined,
                  cueTags: moodCues,
                });
                setDayData((d) => (d ? { ...d, canonicalMood: saved } : d));
                if (settings?.haptics) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            />
            <SelectField
              label="One word"
              placeholder="Optional label"
              value={moodLabel}
              options={MOOD_LABELS}
              formatLabel={(v) =>
                (MOOD_LABELS as readonly string[]).includes(v)
                  ? formatOptionLabel(v)
                  : v
              }
              allowCustom
              normalizeCustom={false}
              customPlaceholder="e.g. drained from work"
              onSelect={(label) => {
                setMoodLabel(label);
                void saveMoodDetails(label);
                if (settings?.haptics) {
                  void Haptics.selectionAsync();
                }
              }}
            />
          </StepContent>
        </TodaySection>

        <TodaySection title="Sleep & energy">
          <StepContent>
            <SelectField
              label="Sleep"
              placeholder="How was sleep?"
              value={sleepQuality}
              options={SLEEP_OPTIONS}
              formatLabel={formatOptionLabel}
              onSelect={(v) => {
                setSleepQuality(v);
                setDayData((d) =>
                  d
                    ? { ...d, dayLog: { ...d.dayLog, sleepQuality: v } }
                    : d
                );
                if (settings?.haptics) {
                  void Haptics.selectionAsync();
                }
                void saveDayContext(activeDate, { sleepQuality: v });
              }}
            />
            <SelectField
              label="Energy"
              placeholder="Energy today?"
              value={energyLevel}
              options={ENERGY_OPTIONS}
              formatLabel={formatOptionLabel}
              onSelect={(v) => {
                setEnergyLevel(v);
                setDayData((d) =>
                  d
                    ? { ...d, dayLog: { ...d.dayLog, energyLevel: v } }
                    : d
                );
                if (settings?.haptics) {
                  void Haptics.selectionAsync();
                }
                void saveDayContext(activeDate, { energyLevel: v });
              }}
            />
          </StepContent>
        </TodaySection>

        {wantSteps.length > 0 ? (
          <Text style={styles.groupLabel}>Your wants</Text>
        ) : null}

        {wantSteps.map((step) => {
          const entry = step.wantId ? habitMap.get(step.wantId) : undefined;
          const status = entry?.status as HabitStatus | undefined;

          if (step.wantCategory === "food" && step.wantId) {
            const food = parseFoodNote(entry?.note);
            return (
              <TodaySection
                key={step.id}
                title={step.title}
                badge={step.frequencyLabel}
              >
                <StepContent>
                  <SelectField
                    label="Mindfulness"
                    placeholder="How mindful?"
                    value={food?.awareness ?? null}
                    options={FOOD_AWARENESS_OPTIONS}
                    onSelect={(v) =>
                      handleFoodLevel(step.wantId!, v, food?.sugar)
                    }
                  />
                  {food?.awareness ? (
                    <SelectField
                      label="Sugar / sweets"
                      placeholder="Optional"
                      value={food?.sugar ?? null}
                      options={SUGAR_OPTIONS}
                      formatLabel={formatOptionLabel}
                      onSelect={(v) =>
                        handleFoodLevel(step.wantId!, food.awareness, v)
                      }
                    />
                  ) : null}
                </StepContent>
              </TodaySection>
            );
          }

          return (
            <TodaySection
              key={step.id}
              title={step.title}
              hint={step.minimumBar ?? undefined}
              badge={step.frequencyLabel}
            >
              <View style={styles.wantActions}>
                <Pressable
                  onPress={() => step.wantId && void markHabit(step.wantId, "done")}
                  style={({ pressed }) => [
                    styles.wantBtn,
                    styles.wantBtnDone,
                    status === "done" && styles.wantBtnActive,
                    pressed && styles.wantBtnPressed,
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={status === "done" ? colors.background : colors.success}
                  />
                  <Text
                    style={[
                      styles.wantBtnText,
                      status === "done" && styles.wantBtnTextActive,
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    step.wantId &&
                    openSkip(step.wantId, step.wantName ?? step.title)
                  }
                  style={({ pressed }) => [
                    styles.wantBtn,
                    styles.wantBtnSkip,
                    status === "skipped" && styles.wantBtnSkipActive,
                    pressed && styles.wantBtnPressed,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={status === "skipped" ? colors.background : colors.danger}
                  />
                  <Text
                    style={[
                      styles.wantBtnText,
                      status === "skipped" && styles.wantBtnTextActive,
                    ]}
                  >
                    Skip
                  </Text>
                </Pressable>
              </View>
            </TodaySection>
          );
        })}

        <TodaySection title="Spending" optional>
          <SpendCapture
            entries={dayData?.spends ?? []}
            onRemove={async (id) => {
              await removeSpendEntry(id);
              setDayData((d) =>
                d ? { ...d, spends: d.spends.filter((s) => s.id !== id) } : d
              );
            }}
            onSubmit={async (input) => {
              const entry = await saveSpendEntry({
                localDate: activeDate,
                ...input,
                scenario: input.scenario ?? "impulse",
              });
              setDayData((d) =>
                d ? { ...d, spends: [entry, ...d.spends] } : d
              );
            }}
          />
        </TodaySection>

        <TodaySection title="Context" optional>
          <MultiSelectField
            label="What surrounded you?"
            placeholder="Work, travel, people…"
            values={contextTags}
            options={DAY_CONTEXT_TAGS}
            formatLabel={formatCueTag}
            onChange={async (next) => {
              setContextTags(next);
              await saveDayContext(activeDate, { contextTags: next });
            }}
          />
        </TodaySection>

        <TodaySection title="Anything unusual?" optional>
          <TextInput
            style={[stepInputStyles.input, stepInputStyles.inputTall]}
            placeholder="Optional — one line if something stood out"
            placeholderTextColor={colors.textDim}
            value={unusual}
            onChangeText={setUnusual}
            onBlur={() => setUnusualNote(activeDate, unusual.trim() || null)}
            multiline
          />
        </TodaySection>

        <PrimaryButton
          label={isComplete ? "Update today" : "Save today"}
          onPress={saveDay}
          disabled={pending.length > 0}
        />
      </KeyboardScroll>

      <Modal visible={!!skipModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What got in the way?</Text>
            <Text style={styles.modalHint}>{skipModal?.wantName}</Text>
            <MultiSelectField
              label="Reasons"
              placeholder="Pick any that apply"
              values={selectedCues}
              options={HABIT_CUE_TAGS}
              formatLabel={formatCueTag}
              onChange={setSelectedCues}
            />
            <PrimaryButton label="Mark skipped" onPress={confirmSkip} />
            <Pressable onPress={() => setSkipModal(null)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dateText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  pendingHint: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "600",
  },
  doneHint: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
  },
  groupLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  wantActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  wantBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  wantBtnDone: {
    borderColor: "rgba(74, 222, 128, 0.4)",
  },
  wantBtnSkip: {
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  wantBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  wantBtnSkipActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  wantBtnPressed: {
    opacity: 0.85,
  },
  wantBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  wantBtnTextActive: {
    color: colors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  modalHint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalCancel: {
    alignItems: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: "600",
  },
});
