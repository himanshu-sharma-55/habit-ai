import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@habit-ai/ui";
import { Card } from "@/components/ui";

type CheckInSectionProps = {
  title: string;
  hint?: string;
  answered?: boolean;
  optional?: boolean;
  accentColor?: string;
  children: React.ReactNode;
};

export function CheckInSection({
  title,
  hint,
  answered,
  optional,
  accentColor = colors.accent,
  children,
}: CheckInSectionProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {optional ? (
              <Text style={styles.optional}>Optional</Text>
            ) : null}
            {answered ? (
              <View style={styles.donePill}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
              </View>
            ) : null}
          </View>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

export function CheckInProgress({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const pct = total > 0 ? done / total : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>Check-in progress</Text>
        <Text style={styles.progressCount}>
          {done}/{total}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  accent: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  optional: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "600",
  },
  donePill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  progressWrap: {
    marginBottom: spacing.md,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  progressCount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
});
