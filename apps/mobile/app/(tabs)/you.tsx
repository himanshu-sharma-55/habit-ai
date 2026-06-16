import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { asCheckInRhythm, type CheckInRhythm } from "@habit-ai/db";
import { colors, spacing } from "@habit-ai/ui";
import { Card, Label, PageHeader, Screen } from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { useApp } from "@/lib/app-context";

const TIME_OPTIONS = ["20:00", "21:00", "22:00", "23:00"];

type SettingRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function SettingRow({ icon, label, hint, children }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.rowContent}>
        <Label>{label}</Label>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        {children}
      </View>
    </View>
  );
}

export default function YouScreen() {
  const { settings, updateSettings } = useApp();
  const [rhythm, setRhythm] = useState<CheckInRhythm>(
    asCheckInRhythm(settings?.checkInRhythm)
  );
  const [time, setTime] = useState(settings?.checkInTime ?? "21:00");

  useEffect(() => {
    if (settings?.checkInRhythm) {
      setRhythm(asCheckInRhythm(settings.checkInRhythm));
    }
    if (settings?.checkInTime) setTime(settings.checkInTime);
  }, [settings?.checkInRhythm, settings?.checkInTime]);

  const saveRhythm = async (value: CheckInRhythm) => {
    setRhythm(value);
    await updateSettings({ checkInRhythm: value });
  };

  const saveTime = async (value: string) => {
    setTime(value);
    await updateSettings({ checkInTime: value });
  };

  return (
    <Screen>
      <PageHeader
        title="You"
        subtitle="Local-first. Your data stays on this device."
      />

      <Card>
        <SettingRow
          icon="repeat-outline"
          label="Check-in rhythm"
          hint="Daily is the default. Alternate/manual are saved for later."
        >
          <SelectField
            placeholder="Choose rhythm"
            value={rhythm}
            options={["daily", "alternate", "manual"]}
            formatLabel={(v) =>
              v === "daily" ? "Daily" : v === "alternate" ? "Alternate" : "Manual"
            }
            onSelect={(v) => saveRhythm(v as CheckInRhythm)}
          />
        </SettingRow>
      </Card>

      <Card>
        <SettingRow
          icon="time-outline"
          label="Reminder time"
          hint="Saved for when push reminders are added."
        >
          <SelectField
            placeholder="Pick a time"
            value={time}
            options={TIME_OPTIONS}
            onSelect={saveTime}
          />
        </SettingRow>
      </Card>

      <Card>
        <SettingRow
          icon="phone-portrait-outline"
          label="Feel & storage"
        >
          <View style={styles.toggleRow}>
            <Text style={styles.value}>Haptic feedback</Text>
            <Pressable
              onPress={() =>
                updateSettings({ haptics: !settings?.haptics })
              }
              style={[
                styles.toggle,
                settings?.haptics && styles.toggleOn,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  settings?.haptics && styles.toggleTextOn,
                ]}
              >
                {settings?.haptics ? "On" : "Off"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            On-device SQLite. Cloud sync is off — Hearing and timeline work
            offline.
          </Text>
        </SettingRow>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowContent: { flex: 1 },
  hint: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  toggleOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleText: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  toggleTextOn: {
    color: colors.background,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
