// Auto-apply AI verdict → label di peta-prasyarat.json
//
// Mapping rules:
//   MATCH_FASE_SAMA  → label "CP-2025"   (📘 Inti — sesuai CP 046)
//   MATCH_FASE_LAIN  → label "Buku-2025" (🌉 Pendukung — di buku tapi placement beda)
//   NO_MATCH         → label "Pengayaan" (🚀 Tantangan — tidak di CP)
//   tidak diaudit    → biarkan label existing
//   strict=false     → biarkan label existing (sudah bridge, label biasanya Buku-2025)
//
// Backup peta-prasyarat.json sebelum write.
//
// Run: node scripts/notebooklm/apply-label-from-audit.mjs [--dry-run]

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");
const CACHE_PATH = resolve(import.meta.dirname, "out", "audit-vs-cp046-truth-cache.json");
const BACKUP_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.backup-pre-label.json");

const dryRun = process.argv.includes("--dry-run");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));
const auditCache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));

const VERDICT_TO_LABEL = {
  MATCH_FASE_SAMA: "CP-2025",
  MATCH_FASE_LAIN: "Buku-2025",
  NO_MATCH: "Pengayaan",
};

const stats = {
  total: peta.submateri.length,
  audited: 0,
  changed: 0,
  unchanged_audited: 0,
  not_audited: 0,
  not_strict: 0,
  by_label_before: {},
  by_label_after: {},
  changes_per_jenjang: { SD: 0, SMP: 0, SMA: 0 },
  examples: [],
};

for (const sub of peta.submateri) {
  // Count current label
  stats.by_label_before[sub.label] = (stats.by_label_before[sub.label] ?? 0) + 1;

  if (!sub.strict) {
    stats.not_strict++;
    stats.by_label_after[sub.label] = (stats.by_label_after[sub.label] ?? 0) + 1;
    continue;
  }
  const audit = auditCache[sub.kode];
  if (!audit || audit.error) {
    stats.not_audited++;
    stats.by_label_after[sub.label] = (stats.by_label_after[sub.label] ?? 0) + 1;
    continue;
  }
  stats.audited++;
  const newLabel = VERDICT_TO_LABEL[audit.verdict];
  if (!newLabel) {
    stats.unchanged_audited++;
    stats.by_label_after[sub.label] = (stats.by_label_after[sub.label] ?? 0) + 1;
    continue;
  }
  if (sub.label !== newLabel) {
    stats.changed++;
    stats.changes_per_jenjang[sub.jenjang] = (stats.changes_per_jenjang[sub.jenjang] ?? 0) + 1;
    if (stats.examples.length < 20) {
      stats.examples.push({
        kode: sub.kode,
        nama: sub.nama,
        from: sub.label,
        to: newLabel,
        verdict: audit.verdict,
        reasoning: audit.reasoning?.slice(0, 100),
      });
    }
    sub.label = newLabel;
  } else {
    stats.unchanged_audited++;
  }
  stats.by_label_after[newLabel] = (stats.by_label_after[newLabel] ?? 0) + 1;
}

// Update label_counts in stats
peta.stats.label_counts = stats.by_label_after;

// Print stats
console.log("\n=== APPLY LABEL FROM AUDIT ===");
console.log(`Total sub: ${stats.total}`);
console.log(`  - Strict (eligible audit): ${stats.total - stats.not_strict}`);
console.log(`  - Non-strict (skip): ${stats.not_strict}`);
console.log(`Audited: ${stats.audited}`);
console.log(`  - Changed label: ${stats.changed}`);
console.log(`  - Unchanged: ${stats.unchanged_audited}`);
console.log(`Not audited: ${stats.not_audited}`);
console.log(`\nChanges per jenjang:`);
for (const [j, n] of Object.entries(stats.changes_per_jenjang)) {
  console.log(`  ${j}: ${n}`);
}
console.log(`\nLabel distribution BEFORE → AFTER:`);
const allLabels = new Set([...Object.keys(stats.by_label_before), ...Object.keys(stats.by_label_after)]);
for (const lbl of [...allLabels].sort()) {
  const before = stats.by_label_before[lbl] ?? 0;
  const after = stats.by_label_after[lbl] ?? 0;
  const delta = after - before;
  const sign = delta > 0 ? `+${delta}` : delta;
  console.log(`  ${lbl.padEnd(15)} ${before} → ${after}  (${sign})`);
}
console.log(`\nSample changes (20 first):`);
for (const ex of stats.examples) {
  console.log(`  ${ex.kode}: ${ex.from} → ${ex.to}  [${ex.verdict}]`);
  console.log(`    "${ex.nama}"`);
  if (ex.reasoning) console.log(`    Reason: ${ex.reasoning}`);
}

if (dryRun) {
  console.log("\n⚠ DRY RUN — no file changes. Run without --dry-run to apply.");
} else {
  // Backup
  if (!existsSync(BACKUP_PATH)) {
    copyFileSync(PETA_PATH, BACKUP_PATH);
    console.log(`\n✓ Backup saved: ${BACKUP_PATH}`);
  } else {
    console.log(`\n⊘ Backup already exists at ${BACKUP_PATH} (not overwriting)`);
  }
  writeFileSync(PETA_PATH, JSON.stringify(peta, null, 2), "utf8");
  console.log(`✓ Updated: ${PETA_PATH}`);
}
