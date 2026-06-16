import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatCueTag, formatOptionLabel, parseTags } from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { Card, PageHeader, Screen } from "@/components/ui";
import { useApp } from "@/lib/app-context";

function moodColor(valence: number | undefined) {
  if (!valence) return colors.textDim;
  if (valence <= 2) return colors.moodLow;
  if (valence >= 4) return colors.moodHigh;
  return colors.moodMid;
}

export default function TimelineScreen() {
  const router = useRouter();
  const { timeline } = useApp();

  return (
    <Screen>
      <PageHeader
        title="Timeline"
        subtitle="What actually happened — tap a day for details."
      />
      <View style={styles.list}>
        {timeline.length === 0 && (
          <Card>
            <Text style={styles.empty}>No days logged yet. Start with Today.</Text>
          </Card>
        )}
        {timeline.map((day) => {
          const doneCount = day.habits.filter(
            (h) => h.status === "done" || h.status === "light"
          ).length;
          return (
            <Pressable
              key={day.dayLog.id}
              onPress={() =>
                router.push({
                  pathname: "/day/[date]",
                  params: { date: day.dayLog.localDate },
                })
              }
              style={({ pressed }) => [pressed && styles.cardPressed]}
            >
              <Card style={styles.cardTight}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: moodColor(day.canonicalMood?.valence) },
                    ]}
                  />
                  <View style={styles.content}>
                    <View style={styles.dateRow}>
                      <Text style={styles.date}>{day.dayLog.localDate}</Text>
                      {day.dayLog.completedAt ? (
                        <View style={styles.completePill}>
                          <Text style={styles.completeText}>Saved</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>
                      Mood {day.canonicalMood?.valence ?? "—"}
                      {day.canonicalMood?.label
                        ? ` · ${day.canonicalMood.label}`
                        : ""}
                      {day.dayLog.sleepQuality
                        ? ` · Sleep ${formatOptionLabel(day.dayLog.sleepQuality)}`
                        : ""}
                      {day.dayLog.energyLevel
                        ? ` · Energy ${formatOptionLabel(day.dayLog.energyLevel)}`
                        : ""}
                    </Text>
                    <Text style={styles.meta}>
                      Habits {doneCount}/{day.habits.length || 0}
                      {day.spends.length ? ` · ${day.spends.length} spend` : ""}
                    </Text>
                    {day.dayLog.unusualNote ? (
                      <Text style={styles.note} numberOfLines={2}>
                        {day.dayLog.unusualNote}
                      </Text>
                    ) : null}
                    {day.habits
                      .filter((h) => h.status === "skipped")
                      .map((h) => (
                        <Text key={h.id} style={styles.skip}>
                          Skipped ·{" "}
                          {parseTags(h.cueTags).map(formatCueTag).join(", ") ||
                            "no cue"}
                        </Text>
                      ))}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textDim}
                    style={styles.chevron}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
        <View style={{ height: spacing.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 16,
  },
  cardTight: {
    marginBottom: spacing.sm,
  },
  cardPressed: {
    opacity: 0.82,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  content: {
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2,
  },
  date: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  completePill: {
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  note: {
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  skip: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
  },
  chevron: {
    marginTop: 4,
  },
});
