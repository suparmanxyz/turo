// Parse research raw JSON → split jadi report.md, sources.json
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const domain = process.argv[2] || "reguler-sd";

const raw = JSON.parse(readFileSync(resolve(ROOT, `${domain}-raw.json`), "utf8"));
const data = raw.data || raw;
const sources = data.sources || [];
const firstSource = sources[0] || {};
const reportMd = firstSource.report_markdown || data.report_markdown || "";
const sourceList = (firstSource.cited_sources || data.cited_sources || []).map((s) => ({
  title: s.title || s.name,
  url: s.url,
  type: s.type || "web",
}));

writeFileSync(resolve(ROOT, `${domain}-report.md`), reportMd);
writeFileSync(resolve(ROOT, `${domain}-sources.json`), JSON.stringify(sourceList, null, 2));

console.log(`✓ ${domain}-report.md (${reportMd.length} chars)`);
console.log(`✓ ${domain}-sources.json (${sourceList.length} sources)`);
console.log(`First 300 chars of report:`);
console.log(reportMd.slice(0, 300));
