import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, radius, spacing } from "@habit-ai/ui";

const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "Very low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
] as const;

export function MoodSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const selected = MOOD_OPTIONS.find((o) => o.value === value) ?? MOOD_OPTIONS[2];

  const tint = useMemo(() => {
    if (value <= 2) return colors.moodLow;
    if (value >= 4) return colors.moodHigh;
    return colors.moodMid;
  }, [value]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.selectedBubble, { borderColor: tint }]}>
        <Text style={styles.selectedEmoji}>{selected.emoji}</Text>
        <Text style={[styles.selectedLabel, { color: tint }]}>
          {selected.label}
        </Text>
      </View>

      <View style={styles.optionsRow}>
        {MOOD_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <MoodOption
              key={option.value}
              emoji={option.emoji}
              isSelected={isSelected}
              tint={tint}
              onPress={() => onChange(option.value)}
            />
          );
        })}
      </View>
      <Text style={styles.helper}>Tap how you feel — one pick only</Text>
    </View>
  );
}

function MoodOption({
  emoji,
  isSelected,
  tint,
  onPress,
}: {
  emoji: string;
  isSelected: boolean;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.option,
        isSelected && [styles.optionSelected, { borderColor: tint }],
      ]}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  selectedBubble: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: colors.surfaceElevated,
  },
  selectedEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  selectedLabel: {
    fontSize: 20,
    fontWeight: "700",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  optionSelected: {
    backgroundColor: "rgba(108, 158, 255, 0.12)",
    borderWidth: 2,
  },
  optionEmoji: {
    fontSize: 24,
  },
  helper: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
});
