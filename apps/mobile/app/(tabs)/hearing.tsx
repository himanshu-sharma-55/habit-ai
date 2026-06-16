import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { HearingEvidence, HearingRange } from "@habit-ai/db";
import { formatCueTag } from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { PrimaryButton, SecondaryButton } from "@/components/chips";
import { KeyboardScroll } from "@/components/keyboard";
import { SelectField } from "@/components/select-field";
import { Card, Label, PageHeader, Screen } from "@/components/ui";
import { useApp } from "@/lib/app-context";

const QUESTIONS = [
  "Why did I stop reading?",
  "Why did workouts drop?",
  "What was going on when mood dipped?",
  "Why did spending go up?",
  "Custom",
];

const PRESET_QUESTIONS = QUESTIONS.filter((q) => q !== "Custom");

const RULINGS = [
  "stress",
  "sleep",
  "environment",
  "people",
  "lost commitment",
  "spending pattern",
  "other",
];

function EvidenceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.evidenceSection}>
      <Text style={styles.evidenceTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EvidenceLine({ children }: { children: React.ReactNode }) {
  return <Text style={styles.evidenceLine}>{children}</Text>;
}

export default function HearingScreen() {
  const params = useLocalSearchParams<{ wantId?: string }>();
  const { wants, runHearing, saveHearingRuling, savedHearings } = useApp();
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [wantId, setWantId] = useState<string | undefined>(
    params.wantId ?? undefined
  );
  const [rangeDays, setRangeDays] = useState<HearingRange>(30);
  const [evidence, setEvidence] = useState<HearingEvidence | null>(null);
  const [ruling, setRuling] = useState<string | null>(null);
  const [rulingNote, setRulingNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.wantId) setWantId(params.wantId);
  }, [params.wantId]);

  const activeQuestion = question;

  const wantOptions = ["", ...wants.map((w) => w.id)];

  const investigate = async () => {
    if (!activeQuestion) return;
    setLoading(true);
    try {
      const result = await runHearing({
        question: activeQuestion,
        wantId,
        rangeDays,
      });
      setEvidence(result);
      setRuling(null);
    } finally {
      setLoading(false);
    }
  };

  const saveRuling = async () => {
    if (!evidence || !ruling) return;
    await saveHearingRuling(evidence, ruling, rulingNote.trim() || undefined);
    Alert.alert("Saved", "Your ruling is recorded.");
    setEvidence(null);
    setRuling(null);
    setRulingNote("");
  };

  return (
    <Screen scroll>
      <PageHeader
        title="Hearing"
        subtitle="Investigate with evidence — patterns, not assumptions."
      />

      <KeyboardScroll>
        <Card>
          <Label>Question</Label>
          <SelectField
            placeholder="What do you want to understand?"
            value={question}
            options={PRESET_QUESTIONS}
            allowCustom
            normalizeCustom={false}
            customPlaceholder="Your own question"
            onSelect={setQuestion}
          />

          <Label>Link to want</Label>
          <SelectField
            placeholder="Any want"
            value={wantId ?? ""}
            options={wantOptions}
            formatLabel={(id) =>
              id ? wants.find((w) => w.id === id)?.name ?? id : "Any"
            }
            onSelect={(id) => setWantId(id || undefined)}
          />

          <Label>Range</Label>
          <SelectField
            placeholder="How far back?"
            value={String(rangeDays)}
            options={["7", "14", "30"]}
            formatLabel={(v) => `${v} days`}
            onSelect={(v) => setRangeDays(Number(v) as HearingRange)}
          />

          <PrimaryButton
            label={loading ? "Building evidence…" : "Investigate"}
            onPress={investigate}
            disabled={loading || !activeQuestion}
          />
          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={styles.loader}
            />
          ) : null}
        </Card>

        {evidence ? (
          <Card>
            <View style={styles.evidenceHeader}>
              <Text style={styles.evidenceQuestion}>{evidence.question}</Text>
              <View style={styles.rangePill}>
                <Text style={styles.rangePillText}>
                  {evidence.rangeStart} → {evidence.rangeEnd}
                </Text>
              </View>
            </View>
            <Text style={styles.evidenceMeta}>
              {evidence.daysLogged} days logged
              {!evidence.hasEnoughData ? " · need more data for strong patterns" : ""}
            </Text>

            {evidence.want ? (
              <EvidenceSection title="Target want">
                <EvidenceLine>
                  {evidence.want.name}: {evidence.want.done} done ·{" "}
                  {evidence.want.skipped} skipped
                  {evidence.want.light ? ` · ${evidence.want.light} light` : ""}
                </EvidenceLine>
                {evidence.want.lastDoneDate ? (
                  <EvidenceLine>
                    Last done: {evidence.want.lastDoneDate}
                  </EvidenceLine>
                ) : (
                  <EvidenceLine>Not logged in this range</EvidenceLine>
                )}
                {Object.keys(evidence.want.skipCues).length > 0 ? (
                  <EvidenceLine>
                    Skip cues:{" "}
                    {Object.entries(evidence.want.skipCues)
                      .map(([tag, count]) => `${formatCueTag(tag)} (${count})`)
                      .join(", ")}
                  </EvidenceLine>
                ) : null}
              </EvidenceSection>
            ) : null}

            <EvidenceSection title="Mood">
              <EvidenceLine>
                Avg: {evidence.mood.avgValence ?? "—"}/5 · Low days:{" "}
                {evidence.mood.lowDays}
              </EvidenceLine>
              {evidence.mood.topLabels.length > 0 ? (
                <EvidenceLine>
                  Top labels:{" "}
                  {evidence.mood.topLabels
                    .map((l) => `${l.label} (${l.count})`)
                    .join(", ")}
                </EvidenceLine>
              ) : null}
            </EvidenceSection>

            {evidence.habits.length > 0 ? (
              <EvidenceSection title="Other habits skipped">
                {evidence.habits.map((h) => (
                  <EvidenceLine key={h.name}>
                    {h.name}: {h.skipped} skipped
                  </EvidenceLine>
                ))}
              </EvidenceSection>
            ) : null}

            <EvidenceSection title="Spending">
              <EvidenceLine>{evidence.spend.total} entries logged</EvidenceLine>
              {Object.keys(evidence.spend.byScenario).length > 0 ? (
                <EvidenceLine>
                  By scenario:{" "}
                  {Object.entries(evidence.spend.byScenario)
                    .map(([s, n]) => `${s} (${n})`)
                    .join(", ")}
                </EvidenceLine>
              ) : null}
              {evidence.spend.impulseOnLowMoodDays > 0 ? (
                <EvidenceLine>
                  Impulse spends on low-mood days:{" "}
                  {evidence.spend.impulseOnLowMoodDays}
                </EvidenceLine>
              ) : null}
            </EvidenceSection>

            {evidence.unusualNotes.length > 0 ? (
              <EvidenceSection title="Unusual notes">
                {evidence.unusualNotes.map((n) => (
                  <EvidenceLine key={`${n.date}-${n.note}`}>
                    {n.date}: {n.note}
                  </EvidenceLine>
                ))}
              </EvidenceSection>
            ) : null}

            {evidence.patterns.length > 0 ? (
              <EvidenceSection title="Patterns (not causes)">
                {evidence.patterns.map((p) => (
                  <EvidenceLine key={p}>• {p}</EvidenceLine>
                ))}
              </EvidenceSection>
            ) : null}

            <Label>Your ruling</Label>
            <SelectField
              placeholder="Pick a ruling"
              value={ruling}
              options={RULINGS}
              allowCustom
              normalizeCustom={false}
              customPlaceholder="Your own ruling"
              onSelect={setRuling}
            />
            <TextInput
              style={styles.input}
              placeholder="Optional note"
              placeholderTextColor={colors.textDim}
              value={rulingNote}
              onChangeText={setRulingNote}
              multiline
            />
            <PrimaryButton
              label="Save ruling"
              onPress={saveRuling}
              disabled={!ruling}
            />
            <SecondaryButton
              label="Clear evidence"
              onPress={() => {
                setEvidence(null);
                setRuling(null);
                setRulingNote("");
              }}
            />
          </Card>
        ) : null}

        {savedHearings.length > 0 ? (
          <Card>
            <Label>Past hearings</Label>
            {savedHearings.map((h) => (
              <View key={h.id} style={styles.pastItem}>
                <Text style={styles.pastQuestion}>{h.question}</Text>
                <Text style={styles.pastMeta}>
                  {h.rangeStart} → {h.rangeEnd}
                  {h.ruling ? ` · ${h.ruling}` : ""}
                </Text>
                {h.note ? (
                  <Text style={styles.pastNote}>{h.note}</Text>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 48,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.sm,
  },
  evidenceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  evidenceQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  rangePill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rangePillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  evidenceMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  evidenceSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  evidenceTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  evidenceLine: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  pastItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pastQuestion: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  pastMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  pastNote: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 4,
    fontStyle: "italic",
  },
});
