import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@habit-ai/ui";

/** Consistent vertical rhythm inside Today section bodies */
export function StepContent({ children }: { children: React.ReactNode }) {
  return <View style={stepStyles.content}>{children}</View>;
}

export function TodaySection({
  title,
  hint,
  optional,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  optional?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stepStyles.section}>
      <View style={stepStyles.sectionHead}>
        <Text style={stepStyles.sectionTitle}>{title}</Text>
        {optional ? (
          <Text style={stepStyles.sectionOptional}>Optional</Text>
        ) : badge ? (
          <Text style={stepStyles.sectionBadge}>{badge}</Text>
        ) : null}
      </View>
      {hint ? <Text style={stepStyles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={stepStyles.fieldLabel}>{children}</Text>;
}

export function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stepStyles.fieldGroup}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}

export const stepInputStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 48,
  },
  inputTall: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
});

const stepStyles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  sectionOptional: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBadge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -spacing.xs,
  },
});

export function WizardProgress({
  label,
  done,
  total,
  compact,
  step,
  stepTotal,
}: {
  label: string;
  done: number;
  total: number;
  compact?: boolean;
  step?: number;
  stepTotal?: number;
}) {
  const pct =
    stepTotal && stepTotal > 0
      ? (step ?? 0) / stepTotal
      : total > 0
        ? done / total
        : 0;
  if (compact) {
    return (
      <View style={styles.progressCompact}>
        <View style={styles.progressTrackCompact}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.progressCountCompact}>
          {stepTotal ? `${step}/${stepTotal}` : `${done}/${total}`}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>{label}</Text>
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
  progressCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    maxWidth: 140,
  },
  progressTrackCompact: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  progressCountCompact: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "right",
  },
});
