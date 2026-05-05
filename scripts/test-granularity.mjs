import petaJson from "../src/data/peta-prasyarat.json" with { type: "json" };

const peta = petaJson;
let maxDeps = 0, maxDepth = 0;
for (const sub of peta.submateri) {
  if (sub.dependents_count > maxDeps) maxDeps = sub.dependents_count;
  if (sub.depth > maxDepth) maxDepth = sub.depth;
}
function gateway(sub) {
  const dep = (sub.dependents_count / maxDeps) * 50;
  const maku = sub.is_maku ? 30 : 0;
  const entry = sub.is_entry_point ? 20 : 0;
  return Math.min(100, Math.round(dep + maku + entry));
}
function complexity(sub) {
  const d = (sub.depth / maxDepth) * 45;
  const p = Math.min(35, sub.prereq.length * 8);
  const n = Math.min(20, sub.nama.split(/\s+/).length * 2.5);
  return Math.min(100, Math.round(d + p + n));
}

// Final: composite formula
function classify(g, c) {
  const composite = g * 0.6 + c * 0.4;
  if (composite >= 55) return "MANDATORY";
  if (composite >= 42) return "CONDITIONAL";
  return "SUFFICIENT";
}

const counts = { MANDATORY: 0, CONDITIONAL: 0, SUFFICIENT: 0 };
const perJenjang = { SD: { M:0, C:0, S:0 }, SMP: { M:0, C:0, S:0 }, SMA: { M:0, C:0, S:0 } };
for (const sub of peta.submateri) {
  const c = classify(gateway(sub), complexity(sub));
  counts[c]++;
  const j = perJenjang[sub.jenjang];
  if (c === "MANDATORY") j.M++;
  else if (c === "CONDITIONAL") j.C++;
  else j.S++;
}
const total = peta.submateri.length;
console.log("Total: " + total);
console.log("MANDATORY: " + counts.MANDATORY + " (" + (counts.MANDATORY/total*100).toFixed(1) + "%)");
console.log("CONDITIONAL: " + counts.CONDITIONAL + " (" + (counts.CONDITIONAL/total*100).toFixed(1) + "%)");
console.log("SUFFICIENT: " + counts.SUFFICIENT + " (" + (counts.SUFFICIENT/total*100).toFixed(1) + "%)");
console.log("\nPer Jenjang:");
for (const [j, v] of Object.entries(perJenjang)) {
  console.log(`  ${j}: M=${v.M} | C=${v.C} | S=${v.S}`);
}
