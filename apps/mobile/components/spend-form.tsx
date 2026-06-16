import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  formatOptionLabel,
  formatSpendSummary,
  SPEND_CATEGORY_OPTIONS,
  type AmountBand,
  type SpendCategory,
} from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { StepContent } from "@/components/check-in-wizard";
import { SelectField } from "@/components/select-field";

const BAND_OPTIONS = ["small", "medium", "large"] as const;
const BAND_LABELS: Record<AmountBand, string> = {
  small: "Under ₹300",
  medium: "₹300–1k",
  large: "Over ₹1k",
};

const SPEND_CATEGORIES = SPEND_CATEGORY_OPTIONS.filter((c) => c !== "subscription");

type SpendEntry = {
  id: string;
  amountExact: number | null;
  amountBand: string;
  category: string;
  scenario: string;
};

type SpendSubmitInput = {
  amountBand?: AmountBand;
  amountExact?: number;
  category: string;
  scenario?: string;
  note?: string;
};

type SpendCaptureProps = {
  entries?: SpendEntry[];
  onSubmit: (input: SpendSubmitInput) => void | Promise<void>;
  onRemove?: (id: string) => void | Promise<void>;
  onCancel?: () => void;
};

export function SpendCapture({
  entries = [],
  onSubmit,
  onRemove,
  onCancel,
}: SpendCaptureProps) {
  const [amountText, setAmountText] = useState("");
  const [band, setBand] = useState<AmountBand | null>(null);

  const parsedAmount = useMemo(() => {
    const digits = amountText.replace(/\D/g, "");
    if (!digits) return null;
    const value = Number.parseInt(digits, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [amountText]);

  const canPickCategory = parsedAmount != null || band != null;

  const resetDraft = () => {
    setAmountText("");
    setBand(null);
  };

  const handleCategoryPick = async (category: string) => {
    if (!canPickCategory) return;
    await onSubmit({
      amountExact: parsedAmount ?? undefined,
      amountBand: parsedAmount == null ? (band ?? "medium") : undefined,
      category: category as SpendCategory,
      scenario: "impulse",
    });
    resetDraft();
  };

  return (
    <StepContent>
      {entries.length > 0 ? (
        <View style={styles.entryList}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryText}>{formatSpendSummary(entry)}</Text>
              {onRemove ? (
                <Pressable onPress={() => onRemove(entry.id)} hitSlop={8}>
                  <Text style={styles.entryUndo}>Undo</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.amountField}>
        <Text style={styles.currency}>₹</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="Amount"
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text.replace(/\D/g, ""));
            setBand(null);
          }}
          returnKeyType="done"
        />
      </View>

      <SelectField
        label="Rough band"
        placeholder="Optional if you entered amount"
        value={band}
        options={BAND_OPTIONS}
        formatLabel={(v) => BAND_LABELS[v as AmountBand] ?? formatOptionLabel(v)}
        onSelect={(v) => {
          setBand(v as AmountBand);
          setAmountText("");
        }}
      />

      <SelectField
        label="What was it for?"
        placeholder={canPickCategory ? "Choose category" : "Add amount or band first"}
        value={null}
        options={SPEND_CATEGORIES}
        formatLabel={formatOptionLabel}
        allowCustom
        customPlaceholder="e.g. medicine, gym"
        disabled={!canPickCategory}
        onSelect={handleCategoryPick}
      />

      {entries.length === 0 ? (
        <Text style={styles.skipHint}>Optional — leave blank if none</Text>
      ) : null}

      {onCancel ? (
        <Pressable onPress={onCancel} style={styles.cancelLink}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      ) : null}
    </StepContent>
  );
}

/** @deprecated Use SpendCapture */
export function SpendForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: SpendSubmitInput) => void;
  onCancel: () => void;
}) {
  return <SpendCapture onSubmit={onSubmit} onCancel={onCancel} />;
}

type CustomChipInputProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/** @deprecated Use MultiSelectField custom input */
export function CustomChipInput({
  placeholder,
  value,
  onChange,
  onSubmit,
}: CustomChipInputProps) {
  return (
    <View style={styles.legacyCustomRow}>
      <TextInput
        style={styles.legacyCustomInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  entryList: {
    gap: spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  entryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  entryUndo: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  currency: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: "700",
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: spacing.sm,
  },
  skipHint: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: "center",
  },
  cancelLink: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  cancelText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: "600",
  },
  legacyCustomRow: {
    gap: spacing.sm,
  },
  legacyCustomInput: {
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
});
