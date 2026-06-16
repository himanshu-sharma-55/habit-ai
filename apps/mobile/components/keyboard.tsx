import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@habit-ai/ui";

export const keyboardScrollProps = {
  keyboardShouldPersistTaps: "handled" as const,
  keyboardDismissMode:
    Platform.OS === "ios" ? ("interactive" as const) : ("on-drag" as const),
  automaticallyAdjustKeyboardInsets: true,
  showsVerticalScrollIndicator: false,
  nestedScrollEnabled: true,
};

export function KeyboardScroll({
  children,
  contentContainerStyle,
  style,
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      {...keyboardScrollProps}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        { paddingBottom: spacing.lg },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/** @deprecated Do not wrap ScrollViews — blocks scroll gestures. Use keyboardDismissMode on ScrollView instead. */
export function KeyboardDismissView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <>{children}</>;
}

export function KeyboardAvoiding({
  children,
  style,
  offset = 0,
  enabled = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
  enabled?: boolean;
}) {
  const insets = useSafeAreaInsets();

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={offset + insets.top}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export function dismissKeyboard() {
  Keyboard.dismiss();
}
