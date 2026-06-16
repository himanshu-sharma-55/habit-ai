import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { HABIT_WANT_TEMPLATES, type CheckInRhythm } from "@habit-ai/db";
import { colors, spacing } from "@habit-ai/ui";
import { Chip, PrimaryButton } from "@/components/chips";
import { Card, PageHeader, Screen } from "@/components/ui";
import { useApp } from "@/lib/app-context";

const STEPS = ["intro", "wants", "rhythm", "preview"] as const;

const STEP_META: Record<(typeof STEPS)[number], { title: string; subtitle: string }> = {
  intro: {
    title: "Track what you did",
    subtitle:
      "Compare it to what you wanted. When life shifts, your log shows where.",
  },
  wants: {
    title: "What do you want?",
    subtitle:
      "Pick habits to track. Mood and spending are part of every check-in.",
  },
  rhythm: {
    title: "Your rhythm",
    subtitle: "When should check-in fit your life?",
  },
  preview: {
    title: "Tonight's check-in",
    subtitle: "About 30–60 seconds. No forms, just taps.",
  },
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState<(typeof STEPS)[number]>("intro");
  const [selected, setSelected] = useState<string[]>([
    "workout",
    "reading",
    "food",
  ]);
  const [rhythm, setRhythm] = useState<CheckInRhythm>("daily");

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const finish = async () => {
    await completeOnboarding(selected, rhythm, "21:00");
    router.replace("/(tabs)/today");
  };

  const meta = STEP_META[step];
  const stepIndex = STEPS.indexOf(step);

  return (
    <Screen>
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        meta={`Step ${stepIndex + 1} of ${STEPS.length}`}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {step === "intro" && (
          <Card>
            <PrimaryButton label="Get started" onPress={() => setStep("wants")} />
          </Card>
        )}

        {step === "wants" && (
          <Card>
            <View style={styles.templateList}>
              {HABIT_WANT_TEMPLATES.map((template) => (
                <Chip
                  key={template.id}
                  label={`${template.name} (${template.frequencyType === "daily" ? "daily" : `${template.frequencyTarget}×/week`})`}
                  selected={selected.includes(template.id)}
                  onPress={() => toggle(template.id)}
                />
              ))}
            </View>
            <PrimaryButton
              label="Next"
              disabled={selected.length < 1}
              onPress={() => setStep("rhythm")}
            />
          </Card>
        )}

        {step === "rhythm" && (
          <Card>
            <View style={styles.templateList}>
              {(["daily", "alternate", "manual"] as CheckInRhythm[]).map(
                (option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={rhythm === option}
                    onPress={() => setRhythm(option)}
                  />
                )
              )}
            </View>
            <PrimaryButton
              label="Preview check-in"
              onPress={() => setStep("preview")}
            />
          </Card>
        )}

        {step === "preview" && (
          <Card>
            {selected.map((id) => {
              const template = HABIT_WANT_TEMPLATES.find((t) => t.id === id);
              if (!template) return null;
              return (
                <Text key={id} style={styles.previewItem}>
                  • {template.name}
                </Text>
              );
            })}
            <Text style={styles.previewItem}>• Mood</Text>
            <Text style={styles.previewItem}>• Spending</Text>
            <PrimaryButton label="Start logging" onPress={finish} />
          </Card>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  templateList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewItem: {
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
});
