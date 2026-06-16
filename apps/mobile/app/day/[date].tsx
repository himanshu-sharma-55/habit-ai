import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getLocalDate,
  formatCueTag,
  formatHabitDisplay,
  formatOptionLabel,
  formatSpendSummary,
  isHabitWant,
  parseTags,
  type HabitStatus,
} from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { useApp } from "@/lib/app-context";
import { stackScreenOptions } from "@/lib/navigation";
import {
  buildCheckInSteps,
  pendingRequiredSteps,
  type DaySnapshot,
} from "@/lib/check-in-steps";

type DayData = Awaited<ReturnType<ReturnType<typeof useApp>["loadDay"]>>;

function moodTint(valence: number | undefined) {
  if (!valence) return colors.textDim;
  if (valence <= 2) return colors.moodLow;
  if (valence >= 4) return colors.moodHigh;
  return colors.moodMid;
}

function toneStyle(tone: ReturnType<typeof formatHabitDisplay>["tone"]) {
  if (tone === "success") return styles.pillSuccess;
  if (tone === "danger") return styles.pillDanger;
  if (tone === "warning") return styles.pillWarning;
  return styles.pillNeutral;
}

function Row({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { wants, wantProgress, loadDay, removeSpendEntry } = useApp();
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);

  const wantById = useMemo(
    () => new Map(wants.map((w) => [w.id, w])),
    [wants]
  );

  const dailyWants = useMemo(
    () => wants.filter((w) => w.frequencyType === "daily" && isHabitWant(w.category)),
    [wants]
  );
  const weeklyWants = useMemo(
    () => wants.filter((w) => w.frequencyType === "weekly" && isHabitWant(w.category)),
    [wants]
  );
  const weeklyProgressMap = useMemo(() => {
    const map = new Map<string, { actual: number; target: number }>();
    wantProgress.forEach((p) =>
      map.set(p.want.id, { actual: p.actual, target: p.target })
    );
    return map;
  }, [wantProgress]);

  const reload = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const result = await loadDay(date);
    setData(result);
    setLoading(false);
  }, [date, loadDay]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isToday = date === getLocalDate();
  const isComplete = Boolean(data?.dayLog.completedAt);

  const snapshot = useMemo<DaySnapshot | null>(() => {
    if (!data) return null;
    const habitMap = new Map(
      data.habits.map((h) => [
        h.wantId,
        { status: h.status as HabitStatus, note: h.note },
      ])
    );
    return {
      hasMood: Boolean(data.canonicalMood),
      sleepQuality: data.dayLog.sleepQuality,
      energyLevel: data.dayLog.energyLevel,
      habitMap,
      hasSpend: data.spends.length > 0,
      contextCount: parseTags(data.dayLog.contextTags).length,
      hasUnusual: Boolean(data.dayLog.unusualNote?.trim()),
    };
  }, [data]);

  const pending = useMemo(() => {
    if (!snapshot) return [];
    const steps = buildCheckInSteps(
      dailyWants,
      weeklyWants,
      weeklyProgressMap
    );
    return pendingRequiredSteps(steps, snapshot);
  }, [snapshot, dailyWants, weeklyWants, weeklyProgressMap]);

  if (!date) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Invalid date</Text>
      </View>
    );
  }

  const moodValence = data?.canonicalMood?.valence;
  const moodColor = moodTint(moodValence);

  return (
    <>
      <Stack.Screen
        options={{
          ...stackScreenOptions,
          headerShown: true,
          title: date,
          headerBackTitle: "Timeline",
        }}
      />
      {loading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { borderColor: moodColor }]}>
            <Text style={styles.heroDate}>{date}</Text>
            <Text style={[styles.heroMood, { color: moodColor }]}>
              {moodValence ? `${moodValence}/5` : "—"}
            </Text>
            <Text style={styles.heroMoodLabel}>
              {data.canonicalMood?.label
                ? formatOptionLabel(data.canonicalMood.label)
                : data.canonicalMood
                  ? "Mood logged"
                  : "Mood not logged"}
            </Text>
            {data.canonicalMood?.justification ? (
              <Text style={styles.heroNote}>{data.canonicalMood.justification}</Text>
            ) : null}
          </View>

          {!isComplete && pending.length > 0 ? (
            <View style={styles.pendingCard}>
              <Text style={styles.sectionTitle}>Still to answer</Text>
              {pending.map((p) => (
                <Text key={p.id} style={styles.pendingLine}>
                  · {p.title}
                </Text>
              ))}
              {isToday ? (
                <Pressable
                  style={styles.editCta}
                  onPress={() => router.push("/(tabs)/today")}
                >
                  <Text style={styles.editCtaText}>Edit on Today →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Your wants</Text>
          <View style={styles.sectionCard}>
            {data.habits.length === 0 ? (
              <Text style={styles.empty}>No wants logged this day.</Text>
            ) : (
              data.habits.map((h) => {
                const want = wantById.get(h.wantId);
                const display = formatHabitDisplay(
                  want?.category ?? "custom",
                  h.status,
                  h.note,
                  h.cueTags
                );
                return (
                  <View key={h.id} style={styles.wantRow}>
                    <View style={styles.wantHead}>
                      <Ionicons name="flag" size={16} color={colors.accent} />
                      <Text style={styles.wantName}>
                        {want?.name ?? "Want"}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, toneStyle(display.tone)]}>
                      <Text style={styles.statusPillText}>{display.headline}</Text>
                    </View>
                    {display.detail ? (
                      <Text style={styles.wantDetail}>{display.detail}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.sectionTitle}>Day log</Text>
          <View style={styles.sectionCard}>
            <Row
              icon="moon-outline"
              label="Sleep"
              value={
                data.dayLog.sleepQuality
                  ? formatOptionLabel(data.dayLog.sleepQuality)
                  : "—"
              }
            />
            <Row
              icon="flash-outline"
              label="Energy"
              value={
                data.dayLog.energyLevel
                  ? formatOptionLabel(data.dayLog.energyLevel)
                  : "—"
              }
            />
            <Row
              icon="people-outline"
              label="Context"
              value={
                parseTags(data.dayLog.contextTags).length
                  ? parseTags(data.dayLog.contextTags)
                      .map(formatCueTag)
                      .join(", ")
                  : "—"
              }
            />
            <Row
              icon="card-outline"
              label="Spending"
              value={
                data.spends.length
                  ? `${data.spends.length} ${data.spends.length === 1 ? "entry" : "entries"}`
                  : "None"
              }
              sub={
                data.spends[0]
                  ? formatSpendSummary(data.spends[0])
                  : undefined
              }
            />
            {data.spends.map((s) => (
              <View key={s.id} style={styles.spendMini}>
                <Text style={styles.spendMiniText}>
                  {formatSpendSummary(s)}
                </Text>
                {isToday && (
                  <Pressable onPress={() => removeSpendEntry(s.id).then(reload)}>
                    <Text style={styles.undo}>Undo</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {data.dayLog.unusualNote ? (
              <Row
                icon="document-text-outline"
                label="Unusual"
                value={data.dayLog.unusualNote}
              />
            ) : null}
          </View>

          {isToday && (
            <Pressable
              style={styles.footerEdit}
              onPress={() => router.push("/(tabs)/today")}
            >
              <Ionicons name="create-outline" size={18} color={colors.accent} />
              <Text style={styles.footerEditText}>
                {pending.length
                  ? `Edit on Today · ${pending.length} open`
                  : "Edit on Today"}
              </Text>
            </Pressable>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    alignItems: "center",
  },
  heroDate: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  heroMood: {
    fontSize: 56,
    fontWeight: "800",
    marginTop: spacing.xs,
    letterSpacing: -2,
  },
  heroMoodLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  heroNote: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  pendingCard: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  pendingLine: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 3,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 15,
  },
  wantRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wantHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xs,
  },
  wantName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: 4,
  },
  pillSuccess: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  pillDanger: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  pillWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  pillNeutral: {
    backgroundColor: colors.surfaceElevated,
  },
  statusPillText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  wantDetail: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(108, 158, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  spendMini: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingLeft: 44,
  },
  spendMiniText: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  undo: {
    color: colors.danger,
    fontWeight: "600",
  },
  editCta: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  editCtaText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 16,
  },
  footerEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
  },
  footerEditText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
  },
});
