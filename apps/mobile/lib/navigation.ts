import { colors } from "@habit-ai/ui";

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.accent,
  headerTitleStyle: {
    color: colors.text,
    fontWeight: "600" as const,
    fontSize: 17,
  },
  headerBackTitle: "Back",
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  animation: "slide_from_right" as const,
};
