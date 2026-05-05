// PDF document untuk hasil diagnostik Turo.
// Pakai @react-pdf/renderer (server-side PDF generation).
//
// Struktur:
//   - Header branding + tanggal
//   - Profil siswa (nama, jenjang, kelas)
//   - Stats utama (kelas estimasi, theta, total soal)
//   - Path routing (Advanced/Standard/Comprehensive/Intensive)
//   - 🌌 Peta Spektrum Matematis (5 dimensi + level + interpretation)
//   - Cluster scores A/B/C
//   - Drilling result (steps + accuracy)
//   - Sub-materi remediasi (top 10)
//   - Footer

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DiagnosticSessionDoc } from "@/lib/firestore-schema";

// Color palette
const C = {
  brand: "#0d9488",        // teal-600
  violet: "#7c3aed",       // violet-600
  violetLight: "#f5f3ff",  // violet-50
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#e11d48",
  sky: "#0284c7",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.slate900, lineHeight: 1.4 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: `2 solid ${C.brand}` },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 28, height: 28, backgroundColor: C.brand, color: C.white, fontSize: 16, fontWeight: "bold", textAlign: "center", paddingTop: 4, borderRadius: 6 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: C.brand },
  headerSubtitle: { fontSize: 8, color: C.slate500 },
  headerDate: { fontSize: 9, color: C.slate500 },

  // Section
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: C.brand, marginTop: 18, marginBottom: 8, paddingBottom: 4, borderBottom: `1 solid ${C.slate200}` },
  subSectionTitle: { fontSize: 11, fontWeight: "bold", color: C.slate900, marginTop: 12, marginBottom: 6 },

  // Profile box
  profileBox: { backgroundColor: C.slate50, padding: 12, borderRadius: 6, marginBottom: 12 },
  profileRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  profileItem: { minWidth: 130 },
  profileLabel: { fontSize: 8, color: C.slate500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  profileValue: { fontSize: 12, fontWeight: "bold", color: C.slate900 },

  // Stats grid
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: C.slate50, padding: 10, borderRadius: 6, borderLeft: `3 solid ${C.brand}` },
  statLabel: { fontSize: 7, color: C.slate500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: "bold", color: C.slate900 },
  statSub: { fontSize: 7, color: C.slate400, marginTop: 2 },

  // Path routing
  pathBox: { padding: 12, borderRadius: 8, marginBottom: 12, border: `2 solid ${C.brand}` },
  pathLabel: { fontSize: 7, color: C.slate500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  pathName: { fontSize: 18, fontWeight: "bold" },
  pathFokus: { fontSize: 9, color: C.slate700, marginTop: 4 },

  // Cluster row
  clusterRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  clusterCard: { flex: 1, backgroundColor: C.white, border: `1 solid ${C.slate200}`, padding: 8, borderRadius: 4 },
  clusterCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  clusterTitle: { fontSize: 9, fontWeight: "bold" },
  clusterStatus: { fontSize: 7, padding: "2 6", borderRadius: 8, fontWeight: "bold" },
  clusterScore: { fontSize: 18, fontWeight: "bold", marginTop: 2 },
  clusterDetails: { fontSize: 7, color: C.slate500, marginTop: 2 },

  // Spektrum dimension card
  spektrumGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  spektrumCard: { width: "31%", backgroundColor: C.white, border: `1 solid ${C.slate200}`, padding: 8, borderRadius: 4, marginBottom: 6 },
  spektrumHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  spektrumName: { fontSize: 8, fontWeight: "bold", flex: 1 },
  spektrumWeight: { fontSize: 7, color: C.slate400 },
  spektrumScore: { fontSize: 16, fontWeight: "bold", marginVertical: 2 },
  spektrumLevel: { fontSize: 6, padding: "1 4", borderRadius: 6, fontWeight: "bold", alignSelf: "flex-start" },
  spektrumBar: { height: 3, backgroundColor: C.slate100, borderRadius: 2, marginTop: 4, overflow: "hidden" },
  spektrumBarFill: { height: 3 },

  // Lists
  list: { paddingLeft: 12 },
  listItem: { fontSize: 9, color: C.slate700, marginBottom: 3 },

  // Drilling step
  drillingStep: { backgroundColor: C.slate50, padding: 8, borderRadius: 4, marginBottom: 4, flexDirection: "row", justifyContent: "space-between" },
  drillingStepLeft: { flex: 1 },
  drillingStepLabel: { fontSize: 9, fontWeight: "bold" },
  drillingStepDesc: { fontSize: 7, color: C.slate500, marginTop: 1 },
  drillingStepRight: { alignItems: "flex-end" },
  drillingStepStatus: { fontSize: 7, padding: "1 6", borderRadius: 6, fontWeight: "bold" },
  drillingStepAccuracy: { fontSize: 11, fontWeight: "bold", marginTop: 2 },

  // Recommendation box
  recBox: { backgroundColor: C.violetLight, padding: 10, borderRadius: 6, borderLeft: `3 solid ${C.violet}`, marginTop: 8 },
  recTitle: { fontSize: 8, fontWeight: "bold", color: C.violet, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  recText: { fontSize: 9, color: C.slate700 },

  // Footer
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, paddingTop: 10, borderTop: `1 solid ${C.slate200}`, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 7, color: C.slate400 },
  footerLink: { fontSize: 7, color: C.brand, fontWeight: "bold" },
  pageNumber: { fontSize: 7, color: C.slate400 },
});

const PATH_COLOR: Record<string, string> = {
  ADVANCED: C.emerald,
  STANDARD: C.sky,
  COMPREHENSIVE: C.amber,
  INTENSIVE: C.rose,
};

const LEVEL_COLOR: Record<string, { bg: string; text: string }> = {
  MASTERY: { bg: C.emerald, text: C.white },
  PROFICIENT: { bg: "#d1fae5", text: "#065f46" },
  DEVELOPING: { bg: "#dbeafe", text: "#1e40af" },
  EMERGING: { bg: "#fef3c7", text: "#78350f" },
  BEGINNING: { bg: "#fee2e2", text: "#991b1b" },
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  siap: { bg: "#d1fae5", text: "#065f46" },
  review: { bg: "#fef3c7", text: "#78350f" },
  remediasi: { bg: "#fee2e2", text: "#991b1b" },
  passed: { bg: "#d1fae5", text: "#065f46" },
  weak: { bg: "#fee2e2", text: "#991b1b" },
  skipped: { bg: C.slate200, text: C.slate500 },
};

const DIMENSION_LABELS: Record<string, { emoji: string; label: string }> = {
  abstract_reasoning: { emoji: "🧠", label: "Penalaran Abstrak" },
  problem_solving: { emoji: "🎯", label: "Pemecahan Masalah" },
  communication: { emoji: "💬", label: "Komunikasi Matematis" },
  persistence: { emoji: "💪", label: "Ketekunan & Fokus" },
  confidence: { emoji: "🎓", label: "Kepercayaan Diri" },
};

function dimensionColor(level: string): string {
  if (level === "MASTERY" || level === "PROFICIENT") return C.emerald;
  if (level === "DEVELOPING") return C.sky;
  if (level === "EMERGING") return C.amber;
  return C.rose;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export type HasilPdfProps = {
  session: DiagnosticSessionDoc;
  userName?: string;
  userEmail?: string;
  jenjangLabel?: string;
  generatedAtMs: number;
};

export const HasilPdfDocument: React.FC<HasilPdfProps> = ({ session, userName, userEmail, jenjangLabel, generatedAtMs }) => {
  const cov = session.hasilCoverage;
  const drilling = session.hasilDrilling;
  const maturity = session.hasilMaturity;
  const deep = session.hasilDeep;
  const generatedAt = formatDate(generatedAtMs);

  return (
    <Document title={`Hasil Diagnostik Turo - ${userName ?? "Siswa"}`} author="Turo · mainmaku.id">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLogo}>t</Text>
            <View>
              <Text style={styles.headerTitle}>Hasil Diagnostik Turo</Text>
              <Text style={styles.headerSubtitle}>turo.mainmaku.id · adaptive math diagnostic</Text>
            </View>
          </View>
          <View>
            <Text style={styles.headerDate}>{formatDate(session.startedAt)}</Text>
            <Text style={styles.footerText}>Sesi: {session.id.slice(0, 12)}...</Text>
          </View>
        </View>

        {/* Profil Siswa */}
        <View style={styles.profileBox}>
          <View style={styles.profileRow}>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Nama Siswa</Text>
              <Text style={styles.profileValue}>{userName ?? userEmail ?? "—"}</Text>
            </View>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Jalur</Text>
              <Text style={styles.profileValue}>{jenjangLabel ?? session.jalur}</Text>
            </View>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Total Soal</Text>
              <Text style={styles.profileValue}>{session.itemsAnswered}</Text>
            </View>
          </View>
        </View>

        {/* Stats utama */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Level Kelas</Text>
            <Text style={styles.statValue}>{session.kelasEstimasi?.toFixed(1) ?? "—"}</Text>
            <Text style={styles.statSub}>estimasi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Theta Global</Text>
            <Text style={styles.statValue}>{session.thetaGlobal?.toFixed(2) ?? "—"}</Text>
            <Text style={styles.statSub}>-3 sampai +3 (IRT)</Text>
          </View>
          {maturity && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Skor Spektrum</Text>
              <Text style={[styles.statValue, { color: C.violet }]}>{maturity.overall}</Text>
              <Text style={styles.statSub}>{maturity.level}</Text>
            </View>
          )}
        </View>

        {/* Path Routing */}
        {cov?.pathRoute && (
          <View>
            <Text style={styles.sectionTitle}>Rekomendasi Jalur Belajar</Text>
            <View style={[styles.pathBox, { borderColor: PATH_COLOR[cov.pathRoute.path] }]}>
              <Text style={styles.pathLabel}>Path</Text>
              <Text style={[styles.pathName, { color: PATH_COLOR[cov.pathRoute.path] }]}>{cov.pathRoute.path}</Text>
              <Text style={styles.pathFokus}>
                <Text style={{ fontWeight: "bold" }}>Fokus:</Text> {cov.pathRoute.fokus}
              </Text>
              <Text style={[styles.pathFokus, { color: C.slate500, marginTop: 2 }]}>
                Estimasi waktu drilling: {cov.pathRoute.duration}
              </Text>
            </View>
          </View>
        )}

        {/* Cluster Scores */}
        {cov?.clusterScores && cov.clusterScores.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skor per Cluster Prereq</Text>
            <View style={styles.clusterRow}>
              {cov.clusterScores.map((c) => {
                const statusColor = STATUS_COLOR[c.status] ?? STATUS_COLOR.review;
                return (
                  <View key={c.cluster} style={styles.clusterCard}>
                    <View style={styles.clusterCardHeader}>
                      <Text style={styles.clusterTitle}>Cluster {c.cluster}</Text>
                      <Text style={[styles.clusterStatus, { backgroundColor: statusColor.bg, color: statusColor.text }]}>{c.status}</Text>
                    </View>
                    <Text style={styles.clusterScore}>
                      {c.itemsAnswered > 0 ? `${Math.round(c.accuracy * 100)}%` : "—"}
                    </Text>
                    <Text style={styles.clusterDetails}>
                      {c.itemsCorrect}/{c.itemsAnswered} soal · target ≥{Math.round(c.threshold * 100)}%
                    </Text>
                    <Text style={styles.clusterDetails}>
                      {c.cluster === "A" ? "Direct Prereq" : c.cluster === "B" ? "Supporting" : "Foundation"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Peta Spektrum Matematis (5 dimensi) */}
        {maturity && (
          <View>
            <Text style={styles.sectionTitle}>Peta Spektrum Matematis (5 Dimensi)</Text>
            <Text style={{ fontSize: 8, color: C.slate500, marginBottom: 8, fontStyle: "italic" }}>
              Bukan APA yang dikuasai, tapi BAGAIMANA cara berpikir matematis.
            </Text>
            <View style={styles.spektrumGrid}>
              {maturity.dimensions.map((d) => {
                const meta = DIMENSION_LABELS[d.dimension] ?? { emoji: "•", label: d.dimension };
                const lvlColor = LEVEL_COLOR[d.level] ?? LEVEL_COLOR.DEVELOPING;
                const dimColor = dimensionColor(d.level);
                return (
                  <View key={d.dimension} style={styles.spektrumCard}>
                    <View style={styles.spektrumHeader}>
                      <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
                      <Text style={styles.spektrumName}>{meta.label}</Text>
                      <Text style={styles.spektrumWeight}>{Math.round(d.weight * 100)}%</Text>
                    </View>
                    <Text style={[styles.spektrumScore, { color: dimColor }]}>{d.overall}</Text>
                    <Text style={[styles.spektrumLevel, { backgroundColor: lvlColor.bg, color: lvlColor.text }]}>{d.level}</Text>
                    <View style={styles.spektrumBar}>
                      <View style={[styles.spektrumBarFill, { width: `${d.overall}%`, backgroundColor: dimColor }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Strengths & Priorities */}
            {(maturity.strengths.length > 0 || maturity.priorityAreas.length > 0) && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                {maturity.strengths.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: "#ecfdf5", padding: 8, borderRadius: 4, borderLeft: `2 solid ${C.emerald}` }}>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: "#065f46", marginBottom: 4 }}>TOP STRENGTHS</Text>
                    {maturity.strengths.slice(0, 3).map((s, i) => (
                      <Text key={i} style={{ fontSize: 8, color: "#065f46", marginBottom: 2 }}>
                        • {s.subDimension.replace(/_/g, " ")} ({s.score})
                      </Text>
                    ))}
                  </View>
                )}
                {maturity.priorityAreas.length > 0 && (
                  <View style={{ flex: 1, backgroundColor: "#fef3c7", padding: 8, borderRadius: 4, borderLeft: `2 solid ${C.amber}` }}>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: "#78350f", marginBottom: 4 }}>PRIORITY AREAS</Text>
                    {maturity.priorityAreas.slice(0, 3).map((s, i) => (
                      <Text key={i} style={{ fontSize: 8, color: "#78350f", marginBottom: 2 }}>
                        • {s.subDimension.replace(/_/g, " ")} ({s.score})
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Footer page 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Turo · mainmaku.id · Generated {generatedAt}
          </Text>
          <Text style={styles.footerLink}>turo.mainmaku.id</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2: Drilling + Remediasi */}
      {(drilling || (deep && deep.remediasiKodes.length > 0)) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerLogo}>t</Text>
              <View>
                <Text style={styles.headerTitle}>Hasil Diagnostik Turo</Text>
                <Text style={styles.headerSubtitle}>{userName ?? userEmail ?? ""} · {formatDate(session.startedAt)}</Text>
              </View>
            </View>
          </View>

          {/* Drilling Result */}
          {drilling && (
            <View>
              <Text style={styles.sectionTitle}>Hasil Drilling Adaptif (Phase 2)</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 9 }}>
                  Path: <Text style={{ fontWeight: "bold", color: PATH_COLOR[drilling.path] }}>{drilling.path}</Text>
                </Text>
                <Text style={{ fontSize: 9 }}>
                  Accuracy: <Text style={{ fontWeight: "bold" }}>{Math.round(drilling.overallAccuracy * 100)}%</Text>
                  ({drilling.itemsAnswered}/{drilling.itemsTotal} soal)
                </Text>
              </View>

              {drilling.steps.map((step, idx) => {
                const statusColor = STATUS_COLOR[step.status] ?? STATUS_COLOR.skipped;
                return (
                  <View key={idx} style={styles.drillingStep}>
                    <View style={styles.drillingStepLeft}>
                      <Text style={styles.drillingStepLabel}>{idx + 1}. {step.label}</Text>
                      <Text style={styles.drillingStepDesc}>
                        {step.itemsAnswered > 0
                          ? `${step.itemsAnswered}/${step.itemsTotal} soal · target ≥${Math.round(step.passThreshold * 100)}%`
                          : "Skip — pool item kurang"}
                      </Text>
                    </View>
                    <View style={styles.drillingStepRight}>
                      <Text style={[styles.drillingStepStatus, { backgroundColor: statusColor.bg, color: statusColor.text }]}>
                        {step.status}
                      </Text>
                      {step.accuracy !== undefined && (
                        <Text style={styles.drillingStepAccuracy}>
                          {Math.round(step.accuracy * 100)}%
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              <View style={styles.recBox}>
                <Text style={styles.recTitle}>REKOMENDASI</Text>
                <Text style={styles.recText}>{drilling.recommendation}</Text>
              </View>
            </View>
          )}

          {/* Remediasi sub-materi */}
          {deep && deep.remediasiKodes.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>
                Sub-Materi Perlu Remediasi ({deep.remediasiKodes.length})
              </Text>
              <Text style={{ fontSize: 8, color: C.slate500, marginBottom: 8, fontStyle: "italic" }}>
                Mulai dari sini biar dasar kuat.
              </Text>
              <View style={{ backgroundColor: "#fef2f2", padding: 10, borderRadius: 6, borderLeft: `3 solid ${C.rose}` }}>
                {deep.remediasiKodes.slice(0, 15).map((kode) => (
                  <Text key={kode} style={{ fontSize: 9, color: "#991b1b", fontFamily: "Courier", marginBottom: 2 }}>
                    • {kode}
                  </Text>
                ))}
                {deep.remediasiKodes.length > 15 && (
                  <Text style={{ fontSize: 8, color: C.slate500, marginTop: 4, fontStyle: "italic" }}>
                    + {deep.remediasiKodes.length - 15} sub-materi lainnya
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Drilling weak kodes */}
          {drilling && drilling.weakKodes.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Sub-Materi Prioritas Drilling ({drilling.weakKodes.length})</Text>
              <View style={{ backgroundColor: "#fffbeb", padding: 10, borderRadius: 6, borderLeft: `3 solid ${C.amber}` }}>
                {drilling.weakKodes.slice(0, 10).map((kode) => (
                  <Text key={kode} style={{ fontSize: 9, color: "#78350f", fontFamily: "Courier", marginBottom: 2 }}>
                    • {kode}
                  </Text>
                ))}
                {drilling.weakKodes.length > 10 && (
                  <Text style={{ fontSize: 8, color: C.slate500, marginTop: 4, fontStyle: "italic" }}>
                    + {drilling.weakKodes.length - 10} sub-materi lainnya
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Turo · mainmaku.id · Generated {generatedAt}
            </Text>
            <Text style={styles.footerLink}>turo.mainmaku.id</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  );
};
