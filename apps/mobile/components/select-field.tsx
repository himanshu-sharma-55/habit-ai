import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@habit-ai/ui";
import { stepInputStyles } from "@/components/check-in-wizard";
import { useKeyboard } from "@/lib/use-keyboard";

type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  value: string | null;
  options: readonly string[];
  formatLabel?: (value: string) => string;
  allowCustom?: boolean;
  customLabel?: string;
  customPlaceholder?: string;
  disabled?: boolean;
  normalizeCustom?: boolean;
  onSelect: (value: string) => void;
};

function SelectSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: keyboardHeight } = useKeyboard();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetAvoider,
            keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null,
          ]}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
            ]}
          >
            <View style={styles.sheetHandle} />
            {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SelectField({
  label,
  placeholder = "Choose one",
  value,
  options,
  formatLabel,
  allowCustom = false,
  customLabel = "Custom",
  customPlaceholder = "Type your own",
  disabled,
  normalizeCustom = true,
  onSelect,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const labelFor = formatLabel ?? ((v: string) => v);

  const displayValue = useMemo(() => {
    if (!value) return null;
    if (value === "__custom__") return customText.trim() || customLabel;
    return labelFor(value);
  }, [value, customText, customLabel, labelFor]);

  const close = () => {
    setOpen(false);
    setShowCustom(false);
    setCustomText("");
    Keyboard.dismiss();
  };

  const pick = (next: string) => {
    onSelect(next);
    close();
  };

  const submitCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onSelect(
      normalizeCustom
        ? trimmed.toLowerCase().replace(/\s+/g, "_")
        : trimmed
    );
    close();
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}
      >
        <Text
          style={[styles.triggerText, !displayValue && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {displayValue ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <SelectSheet open={open} title={label} onClose={close}>
        {showCustom ? (
          <View style={styles.customOnly}>
            <Pressable
              onPress={() => setShowCustom(false)}
              style={styles.customBack}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
              <Text style={styles.customBackText}>Back to list</Text>
            </Pressable>
            <Text style={styles.customTitle}>{customLabel}</Text>
            <TextInput
              style={stepInputStyles.input}
              placeholder={customPlaceholder}
              placeholderTextColor={colors.textDim}
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={submitCustom}
              returnKeyType="done"
              autoFocus
            />
            <Pressable
              onPress={submitCustom}
              disabled={!customText.trim()}
              style={({ pressed }) => [
                styles.customAdd,
                !customText.trim() && styles.customAddDisabled,
                pressed && customText.trim() && styles.customAddPressed,
              ]}
            >
              <Text style={styles.customAddText}>Add</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.optionList}
          >
            {options.map((option) => {
              const selected = value === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => pick(option)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {labelFor(option)}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
            {allowCustom ? (
              <Pressable
                onPress={() => setShowCustom(true)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={styles.optionText}>{customLabel}</Text>
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </SelectSheet>
    </View>
  );
}

type MultiSelectFieldProps = {
  label?: string;
  placeholder?: string;
  values: string[];
  options: readonly string[];
  formatLabel?: (value: string) => string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onChange: (values: string[]) => void;
};

export function MultiSelectField({
  label,
  placeholder = "Choose any that apply",
  values,
  options,
  formatLabel,
  allowCustom = true,
  customPlaceholder = "Add your own",
  onChange,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const labelFor = formatLabel ?? ((v: string) => v);

  const displayValue = useMemo(() => {
    if (!values.length) return null;
    if (values.length === 1) return labelFor(values[0]);
    return `${values.length} selected`;
  }, [values, labelFor]);

  const allOptions = useMemo(() => {
    const extras = values.filter((v) => !options.includes(v));
    return [...options, ...extras];
  }, [options, values]);

  const close = () => {
    setOpen(false);
    setCustomText("");
    Keyboard.dismiss();
  };

  const toggle = (option: string) => {
    onChange(
      values.includes(option)
        ? values.filter((v) => v !== option)
        : [...values, option]
    );
  };

  const addCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const tag = trimmed.toLowerCase().replace(/\s+/g, "_");
    if (!values.includes(tag)) onChange([...values, tag]);
    setCustomText("");
    Keyboard.dismiss();
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text
          style={[styles.triggerText, !displayValue && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {displayValue ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <SelectSheet open={open} title={label} onClose={close}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          style={styles.optionList}
          contentContainerStyle={styles.optionListContent}
        >
          {allOptions.map((option) => {
            const selected = values.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() => toggle(option)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {labelFor(option)}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {allowCustom ? (
          <View style={styles.customBox}>
            <TextInput
              style={stepInputStyles.input}
              placeholder={customPlaceholder}
              placeholderTextColor={colors.textDim}
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
            <Pressable
              onPress={addCustom}
              disabled={!customText.trim()}
              style={({ pressed }) => [
                styles.customAdd,
                !customText.trim() && styles.customAddDisabled,
                pressed && customText.trim() && styles.customAddPressed,
              ]}
            >
              <Text style={styles.customAddText}>Add</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable onPress={close} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </SelectSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  trigger: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  triggerDisabled: {
    opacity: 0.45,
  },
  triggerPressed: {
    borderColor: colors.accent,
  },
  triggerText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  triggerPlaceholder: {
    color: colors.textDim,
    fontWeight: "500",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetAvoider: {
    width: "100%",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  optionList: {
    maxHeight: 280,
  },
  optionListContent: {
    paddingBottom: spacing.xs,
  },
  option: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceElevated,
  },
  optionSelected: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: "700",
  },
  customOnly: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  customBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
  },
  customBackText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  customTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  customBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  customAdd: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  customAddDisabled: {
    opacity: 0.4,
  },
  customAddPressed: {
    opacity: 0.9,
  },
  customAddText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  doneBtn: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  doneBtnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
  },
});
