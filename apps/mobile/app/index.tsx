import { Redirect } from "expo-router";
import { useApp } from "@/lib/app-context";

export default function Index() {
  const { settings } = useApp();

  if (!settings?.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/today" />;
}
