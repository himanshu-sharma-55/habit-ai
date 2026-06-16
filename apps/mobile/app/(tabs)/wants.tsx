import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@habit-ai/ui";
import { Chip, PrimaryButton, SecondaryButton } from "@/components/chips";
import { Card, PageHeader, Screen } from "@/components/ui";
import { KeyboardScroll } from "@/components/keyboard";
import { SelectField } from "@/components/select-field";
import { useApp } from "@/lib/app-context";

export default function WantsScreen() {
  const router = useRouter();
  const { wantProgress, pausedWants, pauseWant, resumeWant, addCustomWant, updateWant } =
    useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editWantId, setEditWantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [minimumBar, setMinimumBar] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [weeklyTarget, setWeeklyTarget] = useState("3");

  const openEdit = (want: (typeof wantProgress)[number]["want"]) => {
    setEditWantId(want.id);
    setName(want.name);
    setMinimumBar(want.minimumBar ?? "");
    setFrequency(want.frequencyType as "daily" | "weekly");
    setWeeklyTarget(String(want.frequencyTarget));
  };

  const submitEdit = async () => {
    if (!editWantId || !name.trim()) return;
    await updateWant(editWantId, {
      name: name.trim(),
      frequencyType: frequency,
      frequencyTarget:
        frequency === "weekly" ? Number(weeklyTarget) || 3 : 1,
      minimumBar: minimumBar.trim() || null,
    });
    setEditWantId(null);
    setName("");
    setMinimumBar("");
  };

  const handlePause = (wantId: string, wantName: string) => {
    Alert.alert(`Pause ${wantName}?`, "History is kept. It stops appearing in check-in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Pause", onPress: () => pauseWant(wantId) },
    ]);
  };

  const submitCustom = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addCustomWant({
      name: trimmed,
      frequencyType: frequency,
      frequencyTarget:
        frequency === "weekly" ? Number(weeklyTarget) || 3 : 1,
    });
    setAddOpen(false);
    setName("");
    setFrequency("daily");
  };

  return (
    <Screen scroll>
      <PageHeader
        title="Wants"
        subtitle="What you committed to — wanted vs did."
      />
      <KeyboardScroll>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={() => setAddOpen(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
          <Text style={styles.addText}>Add custom want</Text>
        </Pressable>

        {wantProgress.length === 0 && (
          <Card>
            <Text style={styles.empty}>No active wants yet.</Text>
          </Card>
        )}
        {wantProgress.map((item) => {
          const gap = item.actual - item.target;
          const gapLabel = gap >= 0 ? `+${gap} ahead` : `${gap} behind`;
          return (
            <Card key={item.want.id}>
              <Text style={styles.name}>{item.want.name}</Text>
              <Text style={styles.progress}>
                {item.actual}/{item.target}{" "}
                <Text style={styles.progressUnit}>
                  {item.want.frequencyType === "weekly" ? "this week" : "today"}
                </Text>
              </Text>
              <Text
                style={[
                  styles.gap,
                  gap >= 0 ? styles.gapGood : styles.gapBad,
                ]}
              >
                {gapLabel}
              </Text>
              {item.lastDoneDate ? (
                <Text style={styles.lastDone}>
                  Last done: {item.lastDoneDate}
                  {item.daysSinceLastDone != null
                    ? ` (${item.daysSinceLastDone}d ago)`
                    : ""}
                </Text>
              ) : (
                <Text style={styles.lastDone}>Not logged yet in this period</Text>
              )}
              {item.want.minimumBar ? (
                <Text style={styles.bar}>{item.want.minimumBar}</Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => openEdit(item.want)}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handlePause(item.want.id, item.want.name)}
                >
                  <Ionicons name="pause-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.pauseText}>Pause</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/hearing",
                      params: { wantId: item.want.id },
                    })
                  }
                >
                  <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.pauseText}>Hearing</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}

        {pausedWants.length > 0 ? (
          <Card>
            <Text style={styles.pausedTitle}>Paused</Text>
            {pausedWants.map((want) => (
              <View key={want.id} style={styles.pausedRow}>
                <Text style={styles.pausedName}>{want.name}</Text>
                <Pressable onPress={() => resumeWant(want.id)}>
                  <Text style={styles.resumeText}>Resume</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </KeyboardScroll>

      <Modal visible={addOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a want</Text>
            <Text style={styles.modalHint}>
              Something you’re willing to track — not a vague “would like to.”
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Meditate, No sugar"
              placeholderTextColor={colors.textDim}
              value={name}
              onChangeText={setName}
            />
            <SelectField
              label="How often?"
              placeholder="Frequency"
              value={frequency}
              options={["daily", "weekly"]}
              formatLabel={(v) => (v === "daily" ? "Daily" : "Weekly")}
              onSelect={(v) => setFrequency(v as "daily" | "weekly")}
            />
            {frequency === "weekly" ? (
              <SelectField
                label="Times per week"
                placeholder="Target"
                value={weeklyTarget}
                options={["2", "3", "4", "5"]}
                onSelect={setWeeklyTarget}
              />
            ) : null}
            <PrimaryButton
              label="Add want"
              disabled={!name.trim()}
              onPress={submitCustom}
            />
            <SecondaryButton label="Cancel" onPress={() => setAddOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!editWantId} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit want</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.textDim}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Minimum bar (e.g. 20 min counts)"
              placeholderTextColor={colors.textDim}
              value={minimumBar}
              onChangeText={setMinimumBar}
            />
            <SelectField
              label="How often?"
              placeholder="Frequency"
              value={frequency}
              options={["daily", "weekly"]}
              formatLabel={(v) => (v === "daily" ? "Daily" : "Weekly")}
              onSelect={(v) => setFrequency(v as "daily" | "weekly")}
            />
            {frequency === "weekly" ? (
              <SelectField
                label="Times per week"
                placeholder="Target"
                value={weeklyTarget}
                options={["2", "3", "4", "5"]}
                onSelect={setWeeklyTarget}
              />
            ) : null}
            <PrimaryButton
              label="Save changes"
              disabled={!name.trim()}
              onPress={submitEdit}
            />
            <SecondaryButton
              label="Cancel"
              onPress={() => setEditWantId(null)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  addText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: { opacity: 0.65 },
  empty: { color: colors.textMuted, fontSize: 16 },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  progress: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  progressUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textMuted,
  },
  gap: { fontSize: 15, fontWeight: "600", marginTop: spacing.xs },
  gapGood: { color: colors.success },
  gapBad: { color: colors.warning },
  lastDone: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  bar: { color: colors.textDim, marginTop: spacing.xs, fontSize: 13 },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  actionText: { color: colors.accent, fontWeight: "600", fontSize: 15 },
  pauseText: { color: colors.textMuted, fontWeight: "600", fontSize: 15 },
  pausedTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  pausedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pausedName: { color: colors.text, fontSize: 16 },
  resumeText: { color: colors.accent, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  modalHint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
});
