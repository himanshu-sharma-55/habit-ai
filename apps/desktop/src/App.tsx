import type { CSSProperties } from "react";
import { colors } from "@habit-ai/ui";
import { HearingView } from "./components/hearing-view";
import { useApp } from "./lib/app-context";

export default function App() {
  const { storage } = useApp();

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>Habit AI</h1>
        <nav style={styles.nav}>
          <span style={styles.navItem}>Timeline</span>
          <span style={styles.navItem}>Wants</span>
          <span style={styles.navActive}>Hearing</span>
          <span style={styles.navItem}>Settings</span>
        </nav>
        <p style={styles.sidebarNote}>
          {storage === "tauri" ? "Local SQLite" : "In-memory preview"}
        </p>
      </aside>
      <main style={styles.main}>
        <HearingView />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: colors.background,
    color: colors.text,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: 220,
    background: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    padding: 24,
    display: "flex",
    flexDirection: "column",
  },
  logo: { fontSize: 20, fontWeight: 800, marginBottom: 32 },
  nav: { display: "flex", flexDirection: "column", gap: 12, flex: 1 },
  navActive: { color: colors.accent, fontWeight: 600 },
  navItem: { color: colors.textMuted },
  sidebarNote: {
    color: colors.textDim,
    fontSize: 12,
    margin: 0,
    marginTop: "auto",
  },
  main: { flex: 1, padding: 32, overflow: "auto" },
};
