import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@habit-ai/ui";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeTone?: "default" | "success" | "warning";
};

export function PageHeader({
  title,
  subtitle,
  meta,
  badge,
  badgeTone = "default",
}: PageHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {badge ? (
          <View
            style={[
              styles.badge,
              badgeTone === "success" && styles.badgeSuccess,
              badgeTone === "warning" && styles.badgeWarning,
            ]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 4,
    fontWeight: "500",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeSuccess: {
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    borderColor: "rgba(74, 222, 128, 0.35)",
  },
  badgeWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
