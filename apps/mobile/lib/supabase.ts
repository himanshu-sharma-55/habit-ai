import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getSupabase, initSupabase } from "@habit-ai/sync";

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined);
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined);

export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
      anonKey &&
      url !== "https://your-project.supabase.co" &&
      anonKey !== "your-anon-key"
  );
}

export function initSupabaseMobile() {
  if (!isSupabaseConfigured()) return null;
  return initSupabase({
    url: url!,
    anonKey: anonKey!,
    storage: AsyncStorage,
  });
}

export { getSupabase };
