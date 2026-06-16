import { useState } from "react";
import type { CSSProperties } from "react";
import type { HearingEvidence, HearingRange } from "@habit-ai/db";
import { formatCueTag } from "@habit-ai/db";
import { colors, radius, spacing } from "@habit-ai/ui";
import { useApp } from "../lib/app-context";

const PRESET_QUESTIONS = [
  "Why did I stop reading?",
  "Why did workouts drop?",
  "What was going on when mood dipped?",
  "Why did spending go up?",
];

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
    <div style={styles.evidenceSection}>
      <h4 style={styles.evidenceTitle}>{title}</h4>
      {children}
    </div>
  );
}

function EvidenceLine({ children }: { children: React.ReactNode }) {
  return <p style={styles.evidenceLine}>{children}</p>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

export function HearingView() {
  const { wants, runHearing, saveHearingRuling, savedHearings, storage } =
    useApp();
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [useCustomQuestion, setUseCustomQuestion] = useState(false);
  const [wantId, setWantId] = useState("");
  const [rangeDays, setRangeDays] = useState<HearingRange>(30);
  const [evidence, setEvidence] = useState<HearingEvidence | null>(null);
  const [ruling, setRuling] = useState("");
  const [customRuling, setCustomRuling] = useState("");
  const [useCustomRuling, setUseCustomRuling] = useState(false);
  const [rulingNote, setRulingNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const activeQuestion = useCustomQuestion
    ? customQuestion.trim()
    : question;

  const activeRuling = useCustomRuling ? customRuling.trim() : ruling;

  const investigate = async () => {
    if (!activeQuestion) return;
    setLoading(true);
    setSavedMessage(null);
    try {
      const result = await runHearing({
        question: activeQuestion,
        wantId: wantId || undefined,
        rangeDays,
      });
      setEvidence(result);
      setRuling("");
      setCustomRuling("");
      setUseCustomRuling(false);
      setRulingNote("");
    } finally {
      setLoading(false);
    }
  };

  const saveRuling = async () => {
    if (!evidence || !activeRuling) return;
    await saveHearingRuling(evidence, activeRuling, rulingNote.trim() || undefined);
    setSavedMessage("Your ruling is recorded.");
    setEvidence(null);
    setRuling("");
    setCustomRuling("");
    setUseCustomRuling(false);
    setRulingNote("");
  };

  return (
    <>
      <header style={styles.header}>
        <h2 style={styles.title}>Hearing</h2>
        <p style={styles.subtitle}>
          Investigate with evidence — patterns, not assumptions.
        </p>
        {storage === "memory" ? (
          <p style={styles.storageNote}>
            Browser preview uses in-memory SQLite with demo data. Run{" "}
            <code>pnpm desktop</code> for persistent local storage.
          </p>
        ) : null}
      </header>

      <div style={styles.layout}>
        <section style={styles.card}>
          <Field label="Question">
            <select
              style={styles.select}
              value={useCustomQuestion ? "__custom__" : question}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom__") {
                  setUseCustomQuestion(true);
                } else {
                  setUseCustomQuestion(false);
                  setQuestion(v);
                }
              }}
            >
              {PRESET_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            {useCustomQuestion ? (
              <input
                style={styles.input}
                placeholder="Your own question"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
              />
            ) : null}
          </Field>

          <Field label="Link to want">
            <select
              style={styles.select}
              value={wantId}
              onChange={(e) => setWantId(e.target.value)}
            >
              <option value="">Any want</option>
              {wants.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Range">
            <select
              style={styles.select}
              value={String(rangeDays)}
              onChange={(e) =>
                setRangeDays(Number(e.target.value) as HearingRange)
              }
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </Field>

          <button
            type="button"
            style={{
              ...styles.primaryButton,
              opacity: loading || !activeQuestion ? 0.6 : 1,
            }}
            disabled={loading || !activeQuestion}
            onClick={() => void investigate()}
          >
            {loading ? "Building evidence…" : "Investigate"}
          </button>
        </section>

        {evidence ? (
          <section style={styles.card}>
            <div style={styles.evidenceHeader}>
              <h3 style={styles.evidenceQuestion}>{evidence.question}</h3>
              <span style={styles.rangePill}>
                {evidence.rangeStart} → {evidence.rangeEnd}
              </span>
            </div>
            <p style={styles.evidenceMeta}>
              {evidence.daysLogged} days logged
              {!evidence.hasEnoughData
                ? " · need more data for strong patterns"
                : ""}
            </p>

            {evidence.want ? (
              <EvidenceSection title="Target want">
                <EvidenceLine>
                  {evidence.want.name}: {evidence.want.done} done ·{" "}
                  {evidence.want.skipped} skipped
                  {evidence.want.light
                    ? ` · ${evidence.want.light} light`
                    : ""}
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

            <Field label="Your ruling">
              <select
                style={styles.select}
                value={useCustomRuling ? "__custom__" : ruling}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") {
                    setUseCustomRuling(true);
                    setRuling("");
                  } else {
                    setUseCustomRuling(false);
                    setRuling(v);
                  }
                }}
              >
                <option value="">Pick a ruling</option>
                {RULINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              {useCustomRuling ? (
                <input
                  style={styles.input}
                  placeholder="Your own ruling"
                  value={customRuling}
                  onChange={(e) => setCustomRuling(e.target.value)}
                />
              ) : null}
            </Field>

            <textarea
              style={styles.textarea}
              placeholder="Optional note"
              value={rulingNote}
              onChange={(e) => setRulingNote(e.target.value)}
              rows={3}
            />

            <div style={styles.actions}>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  opacity: !activeRuling ? 0.6 : 1,
                }}
                disabled={!activeRuling}
                onClick={() => void saveRuling()}
              >
                Save ruling
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setEvidence(null);
                  setRuling("");
                  setCustomRuling("");
                  setUseCustomRuling(false);
                  setRulingNote("");
                }}
              >
                Clear evidence
              </button>
            </div>
          </section>
        ) : (
          <section style={styles.placeholder}>
            <p style={styles.placeholderText}>
              Pick a question and range, then investigate to see mood, habit,
              and spend patterns side by side.
            </p>
          </section>
        )}
      </div>

      {savedMessage ? (
        <p style={styles.savedMessage}>{savedMessage}</p>
      ) : null}

      {savedHearings.length > 0 ? (
        <section style={{ ...styles.card, marginTop: spacing.lg }}>
          <h3 style={styles.colTitle}>Past hearings</h3>
          {savedHearings.map((h) => (
            <div key={h.id} style={styles.pastItem}>
              <p style={styles.pastQuestion}>{h.question}</p>
              <p style={styles.pastMeta}>
                {h.rangeStart} → {h.rangeEnd}
                {h.ruling ? ` · ${h.ruling}` : ""}
              </p>
              {h.note ? <p style={styles.pastNote}>{h.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  header: { marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: 800, margin: 0 },
  subtitle: { color: colors.textMuted, marginTop: 8, marginBottom: 0 },
  storageNote: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 1.5,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 360px) 1fr",
    gap: spacing.md,
    alignItems: "start",
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  placeholder: {
    background: colors.surface,
    border: `1px dashed ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 360,
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  select: {
    background: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    padding: "10px 12px",
    fontSize: 15,
    width: "100%",
  },
  input: {
    background: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    padding: "10px 12px",
    fontSize: 15,
    width: "100%",
    marginTop: spacing.xs,
  },
  textarea: {
    background: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.text,
    padding: spacing.md,
    fontSize: 15,
    width: "100%",
    minHeight: 72,
    resize: "vertical",
    fontFamily: "inherit",
    marginBottom: spacing.md,
  },
  primaryButton: {
    background: colors.accent,
    color: "#0F1117",
    border: "none",
    borderRadius: radius.sm,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  secondaryButton: {
    background: "transparent",
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
  },
  evidenceHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  evidenceQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.4,
    margin: 0,
  },
  rangePill: {
    background: colors.surfaceElevated,
    borderRadius: radius.full,
    padding: "4px 10px",
    border: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  evidenceMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
    marginTop: 0,
  },
  evidenceSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTop: `1px solid ${colors.border}`,
  },
  evidenceTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    margin: `0 0 ${spacing.xs}px`,
  },
  evidenceLine: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 1.5,
    margin: "0 0 4px",
  },
  colTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pastItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  pastQuestion: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  pastMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 0,
  },
  pastNote: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 4,
    fontStyle: "italic",
    marginBottom: 0,
  },
  savedMessage: {
    color: colors.success,
    fontSize: 14,
    marginTop: spacing.md,
  },
};
