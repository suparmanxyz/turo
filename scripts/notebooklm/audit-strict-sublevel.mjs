// Audit Turo strict tagging vs NB CP 046 — SUB-LEVEL matching (bukan per bab).
// Output: PROPOSAL-strict-mismatch-{j}.md per jenjang.
//
// Logic per sub Turo strict:
//   1. Normalize keyword sub.nama
//   2. Cek MATCH ke NB sub_bab di kelas yang SAMA
//   3. Kalau no match di kelas sama → cek di kelas LAIN (cross-kelas)
//   4. Klasifikasi:
//      ✓ MATCH_SAME_KELAS → valid strict (CP 046 confirmed)
//      ⚠ MATCH_OTHER_KELAS → mismatch placement (sub di Turo K6 tapi NB taruh di K7)
//      🚨 NO_MATCH → benar2 tidak ada di NB CP 046 (kandidat untag jadi bridge)
//
// Run: node scripts/notebooklm/audit-strict-sublevel.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");
const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

function loadJson(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
}

const STOPWORDS = new Set([
  "dan", "atau", "dari", "untuk", "yang", "dengan", "pada", "lain", "lainnya",
  "review", "perluasan", "lanjut", "lanjutan", "sederhana", "dasar", "konsep",
  "pengenalan", "pemahaman", "menggunakan", "tentang", "secara", "akan",
  "soal", "cerita", "hari", "konteks", "kontekstual",
]);

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^\w\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(s) {
  const norm = normalize(s);
  return norm
    .split(/[\s-]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Score similarity 0-1 antara Turo sub.nama vs NB sub_bab.
 * Pakai Jaccard-like: intersection / min(set sizes).
 */
function similarity(turoName, nbName) {
  const kwT = new Set(keywords(turoName));
  const kwN = new Set(keywords(nbName));
  if (kwT.size === 0 || kwN.size === 0) return 0;
  let intersection = 0;
  for (const w of kwT) {
    for (const wn of kwN) {
      if (w === wn || w.includes(wn) || wn.includes(w)) {
        intersection++;
        break;
      }
    }
  }
  const minSize = Math.min(kwT.size, kwN.size);
  return intersection / minSize;
}

const MATCH_THRESHOLD = 0.5;

/**
 * Cari best match Turo sub di NB taxonomy.
 * Return { kelas, babNama, subBab, score } atau null.
 */
function findBestMatchInNb(turoSubName, nbTax, restrictKelas = null) {
  let best = null;
  for (const k of nbTax.kelas) {
    if (restrictKelas !== null && k.kelas !== restrictKelas) continue;
    for (const b of k.bab) {
      // Test against bab.nama + each sub_bab
      const candidates = [b.nama, ...b.sub_bab];
      for (const cand of candidates) {
        const score = similarity(turoSubName, cand);
        if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
          best = {
            kelas: k.kelas,
            babNama: b.nama,
            subBab: cand === b.nama ? null : cand,
            score,
          };
        }
      }
    }
  }
  return best;
}

function buildAudit(jenjang, code) {
  const nbTax = loadJson(`reguler-${code}-taxonomy.json`);
  const turoStrict = peta.submateri.filter((s) => s.jenjang === jenjang && s.strict);

  const results = {
    matchSame: [],
    matchOther: [],
    noMatch: [],
  };

  for (const sub of turoStrict) {
    const sameKelas = findBestMatchInNb(sub.nama, nbTax, sub.kelas);
    if (sameKelas) {
      results.matchSame.push({ sub, match: sameKelas });
      continue;
    }
    const anyKelas = findBestMatchInNb(sub.nama, nbTax, null);
    if (anyKelas) {
      results.matchOther.push({ sub, match: anyKelas });
      continue;
    }
    results.noMatch.push({ sub });
  }

  // Group noMatch & matchOther by kelas + bab untuk readability
  function groupByKelasBab(arr) {
    const map = new Map();
    for (const item of arr) {
      const k = item.sub.kelas;
      if (!map.has(k)) map.set(k, new Map());
      const babMap = map.get(k);
      const babKey = `${item.sub.bab_kode}|${item.sub.bab_nama}`;
      if (!babMap.has(babKey)) babMap.set(babKey, []);
      babMap.get(babKey).push(item);
    }
    return map;
  }

  const noMatchGrouped = groupByKelasBab(results.noMatch);
  const matchOtherGrouped = groupByKelasBab(results.matchOther);

  const lines = [];
  lines.push(`# AUDIT: Strict Sub-Level Mismatch — ${jenjang}\n`);
  lines.push(`Sumber: NB CP 046/H/KR/2025 Deep Research`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);

  lines.push(`## Summary\n`);
  const total = turoStrict.length;
  const sm = results.matchSame.length;
  const mo = results.matchOther.length;
  const nm = results.noMatch.length;
  lines.push(`| Status | Count | % |`);
  lines.push(`|---|---|---|`);
  lines.push(`| ✓ MATCH kelas sama (valid strict) | ${sm} | ${(sm/total*100).toFixed(1)}% |`);
  lines.push(`| ⚠ MATCH kelas LAIN (placement mismatch) | ${mo} | ${(mo/total*100).toFixed(1)}% |`);
  lines.push(`| 🚨 NO MATCH (tidak ada di NB CP 046) | ${nm} | ${(nm/total*100).toFixed(1)}% |`);
  lines.push(`| **Total Turo strict** | **${total}** | 100% |`);
  lines.push(``);

  // === 🚨 NO MATCH section ===
  if (nm > 0) {
    lines.push(`## 🚨 NO MATCH — Tidak ada di NB CP 046 (${nm} sub)\n`);
    lines.push(`Sub-materi Turo yang ditandai \`strict: true\` tapi tidak ditemukan di NB CP 046 manapun. Kandidat kuat untuk untag jadi \`bridge\`.\n`);

    const sortedKelas = Array.from(noMatchGrouped.keys()).sort((a, b) => a - b);
    for (const k of sortedKelas) {
      lines.push(`### Kelas ${k}\n`);
      const babMap = noMatchGrouped.get(k);
      for (const [babKey, items] of babMap) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}** (${items.length} sub):`);
        for (const item of items) {
          lines.push(`- \`${item.sub.kode}\` — ${item.sub.nama} _(label: ${item.sub.label})_`);
        }
        lines.push(``);
      }
    }
  } else {
    lines.push(`## 🚨 NO MATCH: NONE — semua strict sub punya match di NB ✓\n`);
  }

  // === ⚠ MATCH OTHER KELAS section ===
  if (mo > 0) {
    lines.push(`## ⚠ MATCH KELAS LAIN — Placement mismatch (${mo} sub)\n`);
    lines.push(`Sub-materi Turo strict yang ada di NB CP 046, **tapi NB taruh di kelas berbeda**. Pertimbangkan: pindah kelas, atau untag jadi bridge.\n`);

    const sortedKelas = Array.from(matchOtherGrouped.keys()).sort((a, b) => a - b);
    for (const k of sortedKelas) {
      lines.push(`### Turo Kelas ${k}\n`);
      const babMap = matchOtherGrouped.get(k);
      for (const [babKey, items] of babMap) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}**:`);
        for (const item of items) {
          const m = item.match;
          const matchInfo = m.subBab ? `"${m.subBab}" di bab "${m.babNama}"` : `bab "${m.babNama}"`;
          lines.push(`- \`${item.sub.kode}\` ${item.sub.nama}`);
          lines.push(`  → NB taruh di **K${m.kelas}**: ${matchInfo} (similarity ${(m.score*100).toFixed(0)}%)`);
        }
        lines.push(``);
      }
    }
  } else {
    lines.push(`## ⚠ MATCH KELAS LAIN: NONE — semua placement match ✓\n`);
  }

  // === Sample matched (sanity check) ===
  lines.push(`## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)\n`);
  for (const item of results.matchSame.slice(0, 10)) {
    const m = item.match;
    const matchInfo = m.subBab ? `"${m.subBab}"` : `bab "${m.babNama}"`;
    lines.push(`- \`${item.sub.kode}\` ${item.sub.nama} ↔ NB K${m.kelas}: ${matchInfo} (${(m.score*100).toFixed(0)}%)`);
  }
  lines.push(``);

  lines.push(`## Cara apply\n`);
  lines.push(`1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untuk untag.`);
  lines.push(`2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan (Turo lebih granular vertikal).`);
  lines.push(`3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.`);
  lines.push(``);
  lines.push(`**Threshold matching**: similarity ≥ ${(MATCH_THRESHOLD*100).toFixed(0)}% (Jaccard-like keyword overlap). Threshold lebih tinggi = lebih strict (banyak no-match), threshold lebih rendah = lebih lenient.`);

  return lines.join("\n");
}

const targets = [
  { jenjang: "SD", code: "sd" },
  { jenjang: "SMP", code: "smp" },
  { jenjang: "SMA", code: "sma" },
];

for (const t of targets) {
  const md = buildAudit(t.jenjang, t.code);
  const outPath = resolve(ROOT, `AUDIT-strict-mismatch-${t.code}.md`);
  writeFileSync(outPath, md, "utf8");
  console.log(`✓ ${outPath}`);
}
