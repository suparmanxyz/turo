/**
 * Server-side function plotter — generate SVG akurat untuk grafik fungsi matematis.
 *
 * AI text-only struggle dengan koordinat presisi → tidak akurat untuk sin/cos/parabola.
 * Solusi: sample N point dari rumus di server, generate path SVG dengan koordinat exact.
 *
 * Pakai Function constructor — admin-only endpoint, accept code injection risk (controlled).
 */

import "server-only";

export type PlotOptions = {
  /** Rumus JS expression dengan variabel "x". Contoh: "Math.sin(x)", "x*x", "Math.exp(-x)" */
  expression: string;
  /** Range x untuk plot. */
  xMin: number;
  xMax: number;
  /** Range y untuk plot (auto kalau tidak diset). */
  yMin?: number;
  yMax?: number;
  /** Resolusi sampling (default 200). */
  samples?: number;
  /** Label di atas grafik (e.g. "y = sin(x)"). */
  label?: string;
  /** Highlight titik penting (e.g. titik puncak, perpotongan sumbu). */
  markers?: { x: number; label?: string; color?: string }[];
  /** Warna kurva (default biru tua). */
  color?: string;
  /** Lebar SVG (default 400). */
  width?: number;
  /** Tinggi SVG (default 280). */
  height?: number;
};

export type PlotResult = {
  svg: string;
  /** Range y yang akhirnya dipakai (untuk audit). */
  yMinUsed: number;
  yMaxUsed: number;
  /** Jumlah titik yang valid (skip NaN/Inf). */
  validPoints: number;
};

const SAFE_GLOBALS = {
  Math,
  // Aliases biar user bisa tulis "sin(x)" bukan "Math.sin(x)"
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, log: Math.log, log2: Math.log2, log10: Math.log10,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  pow: Math.pow, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  PI: Math.PI, E: Math.E,
};

/** Compile expression jadi function (x) => y. Throw kalau invalid. */
function compileExpression(expression: string): (x: number) => number {
  // Whitelist chars: huruf, angka, operator math, kurung, koma, spasi, dot
  if (!/^[a-zA-Z0-9_.+\-*/%()^,\s]+$/.test(expression)) {
    throw new Error("Expression mengandung karakter tidak diizinkan");
  }
  // Replace ^ with ** (biar user bisa tulis "x^2" → "x**2")
  const expr = expression.replace(/\^/g, "**");
  const argNames = Object.keys(SAFE_GLOBALS);
  const argValues = Object.values(SAFE_GLOBALS);
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(...argNames, "x", `return (${expr});`) as (...args: unknown[]) => number;
    return (x: number) => fn(...argValues, x);
  } catch (e) {
    throw new Error(`Gagal compile expression "${expression}": ${e instanceof Error ? e.message : e}`);
  }
}

/** Format tick label biar singkat. */
function formatTick(v: number): string {
  if (Math.abs(v) < 1e-10) return "0";
  if (Math.abs(v % Math.PI) < 0.01) {
    const n = Math.round(v / Math.PI);
    if (n === 0) return "0";
    if (n === 1) return "π";
    if (n === -1) return "-π";
    return `${n}π`;
  }
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  return v.toFixed(2);
}

/**
 * Plot fungsi → return SVG string + metadata.
 */
export function plotFunction(opts: PlotOptions): PlotResult {
  const samples = opts.samples ?? 200;
  const width = opts.width ?? 400;
  const height = opts.height ?? 280;
  const padding = 40; // ruang untuk axis labels

  if (opts.xMax <= opts.xMin) throw new Error("xMax harus > xMin");

  const fn = compileExpression(opts.expression);

  // Sample
  const points: { x: number; y: number }[] = [];
  let yMin = opts.yMin ?? Infinity;
  let yMax = opts.yMax ?? -Infinity;
  const autoY = opts.yMin === undefined && opts.yMax === undefined;
  let validPoints = 0;

  for (let i = 0; i <= samples; i++) {
    const x = opts.xMin + (i / samples) * (opts.xMax - opts.xMin);
    const y = fn(x);
    if (!Number.isFinite(y)) {
      points.push({ x, y: NaN });
      continue;
    }
    points.push({ x, y });
    validPoints++;
    if (autoY) {
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }

  if (validPoints === 0) throw new Error("Tidak ada titik valid (semua hasil NaN/Infinity)");

  // Auto Y: kasih padding 10% atas-bawah
  if (autoY) {
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const yRange = yMax - yMin;
    yMin -= yRange * 0.1;
    yMax += yRange * 0.1;
  }

  // Coord transform: math (x, y) → svg (px, py)
  const px = (x: number) => padding + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * (width - 2 * padding);
  const py = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  // Build path — handle discontinuity (skip NaN segments)
  const pathSegments: string[] = [];
  let inSegment = false;
  for (const p of points) {
    if (Number.isNaN(p.y)) {
      inSegment = false;
      continue;
    }
    // Clamp y ke viewBox biar kurva tidak overflow
    const yClamped = Math.max(yMin, Math.min(yMax, p.y));
    const cmd = inSegment ? "L" : "M";
    pathSegments.push(`${cmd} ${px(p.x).toFixed(2)} ${py(yClamped).toFixed(2)}`);
    inSegment = true;
  }
  const pathStr = pathSegments.join(" ");

  // Generate ticks
  const xTicks = generateTicks(opts.xMin, opts.xMax, /^Math\.(sin|cos|tan)/.test(opts.expression) || /sin|cos|tan/.test(opts.expression));
  const yTicks = generateTicks(yMin, yMax, false);

  // Axis lines (kalau 0 dalam range)
  const xAxisInRange = yMin <= 0 && yMax >= 0;
  const yAxisInRange = opts.xMin <= 0 && opts.xMax >= 0;
  const xAxisY = xAxisInRange ? py(0) : height - padding;
  const yAxisX = yAxisInRange ? px(0) : padding;

  const color = opts.color ?? "#1e40af";

  // Build SVG
  const parts: string[] = [];
  parts.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`);

  // Grid (light)
  for (const t of xTicks) {
    parts.push(`<line x1="${px(t).toFixed(2)}" y1="${padding}" x2="${px(t).toFixed(2)}" y2="${height - padding}" stroke="#e5e7eb" stroke-width="0.8"/>`);
  }
  for (const t of yTicks) {
    parts.push(`<line x1="${padding}" y1="${py(t).toFixed(2)}" x2="${width - padding}" y2="${py(t).toFixed(2)}" stroke="#e5e7eb" stroke-width="0.8"/>`);
  }

  // Axes (darker)
  parts.push(`<line x1="${padding}" y1="${xAxisY.toFixed(2)}" x2="${width - padding}" y2="${xAxisY.toFixed(2)}" stroke="#475569" stroke-width="1.5"/>`);
  parts.push(`<line x1="${yAxisX.toFixed(2)}" y1="${padding}" x2="${yAxisX.toFixed(2)}" y2="${height - padding}" stroke="#475569" stroke-width="1.5"/>`);

  // Axis labels
  parts.push(`<text x="${(width - padding + 4).toFixed(2)}" y="${(xAxisY + 4).toFixed(2)}" font-size="13" fill="#475569" font-style="italic">x</text>`);
  parts.push(`<text x="${(yAxisX - 12).toFixed(2)}" y="${(padding - 4).toFixed(2)}" font-size="13" fill="#475569" font-style="italic">y</text>`);

  // Tick labels
  for (const t of xTicks) {
    if (Math.abs(t) < 1e-10) continue; // skip 0 (sudah di axis)
    parts.push(`<text x="${px(t).toFixed(2)}" y="${(xAxisY + 14).toFixed(2)}" font-size="10" fill="#64748b" text-anchor="middle">${formatTick(t)}</text>`);
  }
  for (const t of yTicks) {
    if (Math.abs(t) < 1e-10) continue;
    parts.push(`<text x="${(yAxisX - 4).toFixed(2)}" y="${(py(t) + 3).toFixed(2)}" font-size="10" fill="#64748b" text-anchor="end">${formatTick(t)}</text>`);
  }

  // Curve
  parts.push(`<path d="${pathStr}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);

  // Markers
  if (opts.markers) {
    for (const m of opts.markers) {
      try {
        const my = fn(m.x);
        if (!Number.isFinite(my)) continue;
        const mx = px(m.x);
        const myPx = py(my);
        const mc = m.color ?? "#dc2626";
        parts.push(`<circle cx="${mx.toFixed(2)}" cy="${myPx.toFixed(2)}" r="4" fill="${mc}"/>`);
        if (m.label) {
          parts.push(`<text x="${(mx + 6).toFixed(2)}" y="${(myPx - 6).toFixed(2)}" font-size="11" fill="${mc}" font-weight="600">${escapeXml(m.label)}</text>`);
        }
      } catch {
        // skip marker error
      }
    }
  }

  // Label di atas
  if (opts.label) {
    parts.push(`<text x="${(width / 2).toFixed(2)}" y="${(padding - 12).toFixed(2)}" font-size="14" fill="#1e293b" text-anchor="middle" font-weight="600">${escapeXml(opts.label)}</text>`);
  }

  parts.push(`</svg>`);

  return {
    svg: parts.join(""),
    yMinUsed: yMin,
    yMaxUsed: yMax,
    validPoints,
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate ~5-7 tick positions di range [min, max].
 * Kalau periodicTrig=true, snap ke kelipatan π/2.
 */
function generateTicks(min: number, max: number, periodicTrig: boolean): number[] {
  const range = max - min;
  if (periodicTrig) {
    // Step = π/2 atau π tergantung range
    const step = range > 4 * Math.PI ? Math.PI : Math.PI / 2;
    const ticks: number[] = [];
    const startK = Math.ceil(min / step);
    const endK = Math.floor(max / step);
    for (let k = startK; k <= endK; k++) ticks.push(k * step);
    return ticks;
  }
  // Generic: step nice (1, 2, 5, 10, 20, ...)
  const targetSteps = 6;
  const rawStep = range / targetSteps;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let nice;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  const step = nice * mag;
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + 1e-10; v += step) ticks.push(v);
  return ticks;
}

// ============================================================
// Preset functions populer (untuk dropdown UI)
// ============================================================

export const PLOT_PRESETS: Array<{
  id: string;
  label: string;
  expression: string;
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  description: string;
}> = [
  {
    id: "sin",
    label: "y = sin(x)",
    expression: "sin(x)",
    xMin: -2 * Math.PI, xMax: 2 * Math.PI,
    yMin: -1.5, yMax: 1.5,
    description: "Sinus standar — periode 2π, amplitudo 1",
  },
  {
    id: "cos",
    label: "y = cos(x)",
    expression: "cos(x)",
    xMin: -2 * Math.PI, xMax: 2 * Math.PI,
    yMin: -1.5, yMax: 1.5,
    description: "Cosinus standar",
  },
  {
    id: "tan",
    label: "y = tan(x)",
    expression: "tan(x)",
    xMin: -2 * Math.PI, xMax: 2 * Math.PI,
    yMin: -5, yMax: 5,
    description: "Tangen — punya asimtot vertikal di π/2 + kπ",
  },
  {
    id: "linear",
    label: "y = x (linear)",
    expression: "x",
    xMin: -5, xMax: 5,
    yMin: -5, yMax: 5,
    description: "Fungsi linear identitas",
  },
  {
    id: "quadratic",
    label: "y = x²",
    expression: "x*x",
    xMin: -5, xMax: 5,
    description: "Parabola standar",
  },
  {
    id: "cubic",
    label: "y = x³",
    expression: "x*x*x",
    xMin: -3, xMax: 3,
    description: "Fungsi pangkat 3",
  },
  {
    id: "exp",
    label: "y = eˣ",
    expression: "exp(x)",
    xMin: -3, xMax: 3,
    description: "Eksponensial natural",
  },
  {
    id: "log",
    label: "y = ln(x)",
    expression: "log(x)",
    xMin: 0.1, xMax: 10,
    description: "Logaritma natural (x > 0)",
  },
  {
    id: "sqrt",
    label: "y = √x",
    expression: "sqrt(x)",
    xMin: 0, xMax: 16,
    description: "Akar kuadrat (x ≥ 0)",
  },
  {
    id: "abs",
    label: "y = |x|",
    expression: "abs(x)",
    xMin: -5, xMax: 5,
    yMin: 0, yMax: 5,
    description: "Nilai mutlak",
  },
];
