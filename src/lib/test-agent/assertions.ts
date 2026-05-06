/**
 * Asersi otomatis berdasarkan persona — verify expected vs actual.
 *
 * Aturan umum:
 *   - Diagnostic harus selesai (stage=selesai, ada hasilCoverage).
 *   - Persona "high_performer" → kelas estimasi >= persona.kelas - 1.
 *   - Persona "always_correct" → kelas estimasi mentok atas + path = ADVANCED.
 *   - Persona "always_wrong" → path = INTENSIVE.
 *   - Persona "weak_foundation_*" → cluster C lemah, ada remediasi.
 *   - Persona "mismatch_kelas_4_acts_8" → kelas estimasi << persona.kelas.
 *   - Maturity profile harus computed (overall > 0, totalItems > 0).
 */

import type { Persona } from "@/lib/test-agent/personas";
import type { Assertion } from "@/lib/test-agent/storage";
import type { DiagnosticSessionDoc } from "@/lib/firestore-schema";

export function runAssertions(
  persona: Persona,
  session: DiagnosticSessionDoc | null,
  stageMilestones: { locator: number; coverage: number; deep: number; drilling: number },
): Assertion[] {
  const out: Assertion[] = [];

  // --- BASELINE: session harus selesai ---
  out.push({
    name: "Session selesai",
    passed: session?.stage === "selesai",
    expected: "selesai",
    actual: session?.stage ?? "null",
    reason: session?.stage !== "selesai" ? "Diagnostic tidak mencapai status selesai" : undefined,
  });

  out.push({
    name: "Coverage stage punya hasil",
    passed: !!session?.hasilCoverage,
    expected: "object",
    actual: session?.hasilCoverage ? "ada" : "null",
  });

  // --- BASELINE: locator items dalam range ---
  out.push({
    name: "Locator 5-7 items",
    passed: stageMilestones.locator >= 5 && stageMilestones.locator <= 7,
    expected: "5..7",
    actual: stageMilestones.locator,
  });

  // --- BASELINE: maturity computed ---
  if (session?.hasilMaturity) {
    out.push({
      name: "Maturity profile computed",
      passed: session.hasilMaturity.overall > 0 && session.hasilMaturity.totalItems > 0,
      expected: "overall > 0 && totalItems > 0",
      actual: `overall=${session.hasilMaturity.overall}, items=${session.hasilMaturity.totalItems}`,
    });
  } else {
    out.push({
      name: "Maturity profile computed",
      passed: false,
      expected: "object",
      actual: "null",
      reason: "hasilMaturity tidak terisi",
    });
  }

  // --- PERSONA-SPECIFIC ---
  const k = persona.key;
  const kelasEst = session?.kelasEstimasi;
  const path = session?.hasilCoverage?.pathRoute?.path;

  if (k === "always_correct") {
    out.push({
      name: "always_correct → kelas estimasi tinggi",
      passed: typeof kelasEst === "number" && kelasEst >= persona.kelas + 1,
      expected: `>= ${persona.kelas + 1}`,
      actual: kelasEst,
    });
    out.push({
      name: "always_correct → path = ADVANCED",
      passed: path === "ADVANCED",
      expected: "ADVANCED",
      actual: path,
    });
  }

  if (k === "always_wrong") {
    out.push({
      name: "always_wrong → kelas estimasi rendah",
      passed: typeof kelasEst === "number" && kelasEst <= persona.kelas - 1,
      expected: `<= ${persona.kelas - 1}`,
      actual: kelasEst,
    });
    out.push({
      name: "always_wrong → path = INTENSIVE",
      passed: path === "INTENSIVE",
      expected: "INTENSIVE",
      actual: path,
    });
  }

  if (k.startsWith("high_performer") || k.startsWith("gifted")) {
    out.push({
      name: `${k} → kelas estimasi >= persona.kelas - 1`,
      passed: typeof kelasEst === "number" && kelasEst >= persona.kelas - 1,
      expected: `>= ${persona.kelas - 1}`,
      actual: kelasEst,
    });
    out.push({
      name: `${k} → path bukan INTENSIVE`,
      passed: path !== "INTENSIVE",
      expected: "ADVANCED|STANDARD|COMPREHENSIVE",
      actual: path,
    });
  }

  if (k.startsWith("weak_foundation")) {
    out.push({
      name: `${k} → ada area suspect`,
      passed: (session?.hasilCoverage?.areaSuspect?.length ?? 0) > 0,
      expected: ">= 1 area",
      actual: session?.hasilCoverage?.areaSuspect?.length ?? 0,
    });
    out.push({
      name: `${k} → ada items remediasi`,
      passed: (session?.hasilDeep?.remediasiKodes?.length ?? 0) > 0,
      expected: ">= 1 sub remediasi",
      actual: session?.hasilDeep?.remediasiKodes?.length ?? 0,
    });
  }

  if (k.startsWith("mismatch_kelas_")) {
    // Match "mismatch_kelas_4_acts_8" → realKelas = 4
    const m = k.match(/mismatch_kelas_(\d+)_acts/);
    const realKelas = m ? parseInt(m[1], 10) : null;
    if (realKelas !== null) {
      out.push({
        name: `${k} → kelas estimasi <= ${realKelas + 1}`,
        passed: typeof kelasEst === "number" && kelasEst <= realKelas + 1,
        expected: `<= ${realKelas + 1}`,
        actual: kelasEst,
        reason: typeof kelasEst === "number" && kelasEst > realKelas + 1
          ? `Engine over-estimate kelas — IRT tidak detect kemampuan asli`
          : undefined,
      });
    }
  }

  if (k === "weak_aljabar_smp_8") {
    const aljabarStatus = session?.hasilCoverage?.perArea?.find((a) => a.area === "aljabar")?.status;
    out.push({
      name: `weak_aljabar → area aljabar = lemah`,
      passed: aljabarStatus === "lemah",
      expected: "lemah",
      actual: aljabarStatus,
    });
  }

  return out;
}
