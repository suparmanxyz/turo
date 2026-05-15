/**
 * Server-side function plotter — generate SVG akurat untuk grafik fungsi matematis.
 *
 * AI text-only struggle dengan koordinat presisi → tidak akurat untuk sin/cos/parabola.
 * Solusi: sample N point dari rumus di server, generate path SVG dengan koordinat exact.
 *
 * Pakai Function constructor — admin-only endpoint, accept code injection risk (controlled).
 */

import "server-only";
import katex from "katex";

/** Nama fungsi untuk label (f, g, h, p, q, r). Skip "e" (Euler) dan single ambiguous. */
const CURVE_FUNC_NAMES = ["f", "g", "h", "p", "q", "r"];

/**
 * Convert expression dari syntax compile (`x^2`, `2*x`, `sqrt(x)`, `pi`) ke LaTeX syntax.
 * Pakai untuk render KaTeX.
 */
function toLatex(expr: string): string {
  let r = expr
    .replace(/\bsqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\babs\(([^)]+)\)/g, "\\left|$1\\right|")
    .replace(/\bsin\b/g, "\\sin")
    .replace(/\bcos\b/g, "\\cos")
    .replace(/\btan\b/g, "\\tan")
    .replace(/\bln\b/g, "\\ln")
    .replace(/\blog\b/g, "\\log")
    .replace(/\bexp\b/g, "\\exp")
    .replace(/\bpi\b/gi, "\\pi");
  // Pangkat: x^2 → x^{2}, x^(-1) → x^{-1}
  r = r.replace(/\^(\([^)]+\)|\d+|[a-zA-Z])/g, "^{$1}");
  // Multiplication: pakai \cdot di antara digit dan letter wisbukan kelumrahan
  // Tapi LaTeX standard: keep implicit (2x), so HAPUS * antara digit/letter & letter/paren
  for (let i = 0; i < 3; i++) {
    r = r.replace(/(\d|[a-zA-Z}])\s*\*\s*([a-zA-Z\(\\])/g, "$1$2");
  }
  // Sisa * → \cdot
  r = r.replace(/\s*\*\s*/g, " \\cdot ");
  return r;
}

/** Render LaTeX expression jadi HTML+MathML (KaTeX). */
function renderLatex(expr: string): string {
  try {
    return katex.renderToString(expr, {
      displayMode: false,
      throwOnError: false,
      output: "htmlAndMathml",
      strict: "ignore",
    });
  } catch {
    return expr;
  }
}

export type PlotCurve = {
  expression: string;
  color?: string;
  label?: string;
  /** Width stroke (default 2.5) */
  strokeWidth?: number;
  /** Dash pattern (e.g. "5,3" untuk dashed) */
  dasharray?: string;
};

export type CustomLabel = {
  text: string;
  /** Posisi dalam koordinat matematika (akan di-transform ke pixel). */
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  /** anchor: start | middle | end (default middle) */
  anchor?: "start" | "middle" | "end";
};

export type ShadedArea = {
  /** Expression untuk batas atas/bawah area. */
  fromExpression: string;
  toExpression?: string; // Kalau tidak di-set, default ke y=0 (area sumpah ke sumbu x)
  xFrom: number;
  xTo: number;
  color?: string;
  opacity?: number;
};

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
  /**
   * Format label sumbu X.
   * "auto" — radian untuk fungsi trig (sin/cos/tan), numerik untuk lainnya
   * "radian" — kelipatan π (e.g. π/2, π, 2π)
   * "derajat" — derajat (90°, 180°, 360°). Otomatis konversi xMin/xMax dari radian
   * "numerik" — angka biasa (1, 2, 3, dst)
   */
  xTickMode?: "auto" | "radian" | "derajat" | "numerik";
  /**
   * Tambahan curves (multi-line). Curve PERTAMA tetap dari `expression` (utama).
   * Extra curves di-render dengan warna berbeda (auto rotate kalau tidak set).
   */
  extraCurves?: PlotCurve[];
  /** Custom labels (text di posisi koordinat matematika tertentu). */
  customLabels?: CustomLabel[];
  /** Shaded areas (e.g. area di bawah kurva, antara dua fungsi). */
  shadedAreas?: ShadedArea[];
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
  ln: Math.log, // ln(x) = natural log = Math.log
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  pow: Math.pow, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  PI: Math.PI, E: Math.E,
  pi: Math.PI, e: Math.E, // lowercase aliases
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

/** Format tick label biar singkat. Mode menentukan format. */
function formatTick(v: number, mode: "radian" | "derajat" | "numerik" = "numerik"): string {
  if (Math.abs(v) < 1e-10) return "0";
  if (mode === "derajat") {
    // Konversi radian → derajat
    const deg = (v * 180) / Math.PI;
    if (Math.abs(deg - Math.round(deg)) < 0.5) return `${Math.round(deg)}°`;
    return `${deg.toFixed(1)}°`;
  }
  if (mode === "radian") {
    // Snap ke kelipatan π/4 atau π/2
    const halfPi = Math.PI / 2;
    const quartPi = Math.PI / 4;
    // Coba kelipatan π/2 dulu (lebih bersih)
    const nHalf = v / halfPi;
    if (Math.abs(nHalf - Math.round(nHalf)) < 0.05) {
      const n = Math.round(nHalf);
      if (n === 0) return "0";
      if (n === 1) return "π/2";
      if (n === -1) return "-π/2";
      if (n === 2) return "π";
      if (n === -2) return "-π";
      if (n % 2 === 0) return `${n / 2}π`;
      return `${n}π/2`;
    }
    // Kelipatan π/4
    const nQuart = v / quartPi;
    if (Math.abs(nQuart - Math.round(nQuart)) < 0.05) {
      const n = Math.round(nQuart);
      if (n === 1) return "π/4";
      if (n === -1) return "-π/4";
      if (n === 3) return "3π/4";
      if (n === -3) return "-3π/4";
      return `${n}π/4`;
    }
    // Fallback decimal
    return v.toFixed(2);
  }
  // Numerik
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

  // Build path — handle discontinuity (skip NaN segments) + skip out-of-range
  // (mencegah garis horizontal artifact di yMin/yMax kalau kurva keluar range)
  const pathSegments: string[] = [];
  let inSegment = false;
  for (const p of points) {
    if (Number.isNaN(p.y) || !Number.isFinite(p.y) || p.y < yMin || p.y > yMax) {
      inSegment = false;
      continue;
    }
    const cmd = inSegment ? "L" : "M";
    pathSegments.push(`${cmd} ${px(p.x).toFixed(2)} ${py(p.y).toFixed(2)}`);
    inSegment = true;
  }
  const pathStr = pathSegments.join(" ");

  // Resolve xTickMode auto → radian (kalau trig) atau numerik
  const isTrig = /\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh)\s*\(/.test(opts.expression);
  let xTickMode: "radian" | "derajat" | "numerik" = "numerik";
  if (opts.xTickMode === "radian") xTickMode = "radian";
  else if (opts.xTickMode === "derajat") xTickMode = "derajat";
  else if (opts.xTickMode === "numerik") xTickMode = "numerik";
  else if (isTrig) xTickMode = "radian"; // auto

  // Generate ticks — periodicTrig kalau radian/derajat (snap ke π/2)
  const xTicks = generateTicks(opts.xMin, opts.xMax, xTickMode === "radian" || xTickMode === "derajat");
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
    parts.push(`<text x="${px(t).toFixed(2)}" y="${(xAxisY + 14).toFixed(2)}" font-size="10" fill="#64748b" text-anchor="middle">${formatTick(t, xTickMode)}</text>`);
  }
  for (const t of yTicks) {
    if (Math.abs(t) < 1e-10) continue;
    parts.push(`<text x="${(yAxisX - 4).toFixed(2)}" y="${(py(t) + 3).toFixed(2)}" font-size="10" fill="#64748b" text-anchor="end">${formatTick(t, "numerik")}</text>`);
  }

  // ====== SHADED AREAS (di bawah curves, supaya tidak menutup kurva) ======
  if (opts.shadedAreas && opts.shadedAreas.length > 0) {
    for (const area of opts.shadedAreas) {
      try {
        const fnFrom = compileExpression(area.fromExpression);
        const fnTo = area.toExpression ? compileExpression(area.toExpression) : (_x: number) => 0;
        const xs: number[] = [];
        const stepSamples = 60;
        for (let i = 0; i <= stepSamples; i++) {
          xs.push(area.xFrom + (i / stepSamples) * (area.xTo - area.xFrom));
        }
        const upper = xs.map((x) => ({ x, y: fnFrom(x) }));
        const lower = xs.map((x) => ({ x, y: fnTo(x) }));
        const path: string[] = [];
        path.push(`M ${px(upper[0].x).toFixed(2)} ${py(Math.max(yMin, Math.min(yMax, upper[0].y))).toFixed(2)}`);
        for (let i = 1; i < upper.length; i++) {
          path.push(`L ${px(upper[i].x).toFixed(2)} ${py(Math.max(yMin, Math.min(yMax, upper[i].y))).toFixed(2)}`);
        }
        for (let i = lower.length - 1; i >= 0; i--) {
          path.push(`L ${px(lower[i].x).toFixed(2)} ${py(Math.max(yMin, Math.min(yMax, lower[i].y))).toFixed(2)}`);
        }
        path.push("Z");
        const ac = area.color ?? "#3b82f6";
        const ao = area.opacity ?? 0.18;
        parts.push(`<path d="${path.join(" ")}" fill="${ac}" fill-opacity="${ao}" stroke="none"/>`);
      } catch {
        // skip area error
      }
    }
  }

  // Helper: cari anchor untuk label kurva. Multi-curve = diverse x position.
  //   idx=0 (main):    center (40-60%)
  //   idx=1 (extra 1): right of center (60-80%)
  //   idx=2 (extra 2): left of center (20-40%)
  //   idx=3+:          stagger lebih lebar
  function findLabelAnchor(curveFn: (x: number) => number, idx = 0): { x: number; y: number } | null {
    const ranges: [number, number][] = [
      [0.40, 0.60], // main: center
      [0.65, 0.85], // extra 1: right
      [0.15, 0.35], // extra 2: left
      [0.50, 0.70], // extra 3: right-center
      [0.30, 0.50], // extra 4: left-center
      [0.70, 0.90], // extra 5: far right
    ];
    const [lo, hi] = ranges[idx % ranges.length]!;
    const tries = 40;
    for (let i = 0; i <= tries; i++) {
      const ratio = lo + (i / tries) * (hi - lo);
      const xv = opts.xMin + ratio * (opts.xMax - opts.xMin);
      const yv = curveFn(xv);
      if (Number.isFinite(yv) && yv >= yMin && yv <= yMax) return { x: xv, y: yv };
    }
    // Fallback: try wider range
    for (let i = tries; i >= 0; i--) {
      const ratio = 0.20 + (i / tries) * 0.60;
      const xv = opts.xMin + ratio * (opts.xMax - opts.xMin);
      const yv = curveFn(xv);
      if (Number.isFinite(yv) && yv >= yMin && yv <= yMax) return { x: xv, y: yv };
    }
    return null;
  }

  // Build inline curve label SVG — KaTeX, 1 baris (white-space: nowrap, no wrap).
  // Posisi awal dekat kurva; user bisa drag ke posisi presisi via inline editor.
  function buildCurveLabel(text: string, anchorX: number, anchorY: number, color: string, offsetIdx = 0, funcName = "f"): string {
    const ax = px(anchorX);
    const ay = py(anchorY);
    const labelHeight = 26;
    const margin = 8;

    // Vertical offset alternate atas-bawah untuk multi-curve
    const verticalDir = offsetIdx % 2 === 0 ? -1 : 1;
    const offsetY = verticalDir === -1 ? -labelHeight - 2 : margin;

    const lx = ax + margin;
    let ly = ay + offsetY;
    if (ly < 2) ly = ay + margin;
    if (ly + labelHeight > height - 2) ly = ay - labelHeight - 2;

    const cleanExpr = text.replace(/^\s*(y|f\(x\)|g\(x\)|h\(x\))\s*=\s*/i, "");
    const latex = `${funcName}(x) = ${toLatex(cleanExpr)}`;
    const katexHtml = renderLatex(latex);
    // Width 400 + overflow:visible + white-space:nowrap → 1 baris terjamin
    // Boleh keluar viewBox karena user bisa drag ke posisi presisi
    return `<foreignObject x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" width="400" height="${labelHeight + 6}" style="overflow:visible">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="color:${color};font-size:14px;line-height:1.2;white-space:nowrap;text-shadow:1.5px 0 white,-1.5px 0 white,0 1.5px white,0 -1.5px white,1px 1px white,-1px -1px white,1px -1px white,-1px 1px white;display:inline-block">` +
      katexHtml +
      `</div></foreignObject>`;
  }

  // ====== EXTRA CURVES (multi-line) — render before main curve so main on top ======
  const extraCurveColors = ["#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];
  const extraCurveLabels: { text: string; anchor: { x: number; y: number }; color: string; idx: number }[] = [];
  if (opts.extraCurves && opts.extraCurves.length > 0) {
    opts.extraCurves.forEach((curve, idx) => {
      try {
        const fnExtra = compileExpression(curve.expression);
        const segs: string[] = [];
        let inSeg = false;
        for (let i = 0; i <= samples; i++) {
          const xv = opts.xMin + (i / samples) * (opts.xMax - opts.xMin);
          const yv = fnExtra(xv);
          // Skip out-of-range untuk hindari garis horizontal artifact
          if (!Number.isFinite(yv) || yv < yMin || yv > yMax) { inSeg = false; continue; }
          segs.push(`${inSeg ? "L" : "M"} ${px(xv).toFixed(2)} ${py(yv).toFixed(2)}`);
          inSeg = true;
        }
        const cc = curve.color ?? extraCurveColors[idx % extraCurveColors.length];
        const sw = curve.strokeWidth ?? 2.5;
        const da = curve.dasharray ? ` stroke-dasharray="${curve.dasharray}"` : "";
        parts.push(`<path d="${segs.join(" ")}" fill="none" stroke="${cc}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${da}/>`);

        // Stash label info (render setelah main curve supaya di atas semua)
        const labelText = curve.label ?? `y = ${curve.expression}`;
        const anchor = findLabelAnchor(fnExtra, idx + 1);
        if (anchor) extraCurveLabels.push({ text: labelText, anchor, color: cc, idx: idx + 1 });
      } catch {
        // skip extra curve error
      }
    });
  }

  // Curve utama (di atas extra curves)
  parts.push(`<path d="${pathStr}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);

  // ====== INLINE CURVE LABELS (KaTeX-rendered via foreignObject) ======
  // Naming: main = f(x), extra = g(x), h(x), p(x), q(x), r(x)
  const mainAnchor = findLabelAnchor(fn, 0);
  if (mainAnchor) {
    parts.push(buildCurveLabel(opts.label ?? opts.expression, mainAnchor.x, mainAnchor.y, color, 0, CURVE_FUNC_NAMES[0]));
  }
  for (const el of extraCurveLabels) {
    const funcName = CURVE_FUNC_NAMES[el.idx] ?? CURVE_FUNC_NAMES[CURVE_FUNC_NAMES.length - 1];
    parts.push(buildCurveLabel(el.text, el.anchor.x, el.anchor.y, el.color, el.idx, funcName));
  }

  // ====== CUSTOM LABELS (text di koordinat matematika) ======
  if (opts.customLabels && opts.customLabels.length > 0) {
    for (const lbl of opts.customLabels) {
      const lx = px(lbl.x);
      const ly = py(lbl.y);
      const fc = lbl.color ?? "#1e293b";
      const fs = lbl.fontSize ?? 12;
      const ta = lbl.anchor ?? "middle";
      parts.push(`<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" font-size="${fs}" fill="${fc}" text-anchor="${ta}" font-weight="500">${escapeXml(lbl.text)}</text>`);
    }
  }

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

  // Note: label di atas grafik dihapus — sekarang label inline dekat kurva
  // (rendered above sebagai buildCurveLabel + extra curve labels)

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

/** Format expression matematika ke unicode-pretty LaTeX-style (untuk label tampilan). */
function prettyMath(s: string): string {
  let r = s
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^4\b/g, "⁴")
    .replace(/\^5\b/g, "⁵")
    .replace(/\^6\b/g, "⁶")
    .replace(/\^7\b/g, "⁷")
    .replace(/\^8\b/g, "⁸")
    .replace(/\^9\b/g, "⁹")
    .replace(/\^0\b/g, "⁰")
    .replace(/\^\(-1\)/g, "⁻¹")
    .replace(/\^\(-2\)/g, "⁻²")
    .replace(/\bpi\b/gi, "π")
    .replace(/\bsqrt\(([^)]+)\)/g, "√($1)")
    .replace(/\babs\(([^)]+)\)/g, "|$1|");

  // Implicit multiplication LaTeX-style:
  //   - 4*x → 4x (digit × variable)
  //   - 2*(x+1) → 2(x+1) (digit × group)
  //   - 4*sin(x) → 4sin(x) (digit × function call)
  //   - x*y → xy (variable × variable)
  // Apply berulang untuk handle chain seperti 2*x*y → 2xy
  for (let i = 0; i < 3; i++) {
    r = r.replace(/(\d|[a-zA-Z²³⁴⁵⁶⁷⁸⁹⁰⁻]|\))\s*\*\s*([a-zA-Z\(])/g, "$1$2");
  }
  // Sisa * (e.g. digit*digit) → ·
  r = r.replace(/\s*\*\s*/g, "·");

  // Simplify -(single-term-with-superscript): -(x²) → -x²
  r = r.replace(/-\(([a-zA-Zπ²³⁴⁵⁶⁷⁸⁹⁰]+)\)/g, "-$1");

  // Add spaces around binary +/- antara operand (LaTeX style: "x² + 4x - 1")
  // Pattern: (operand char)(+ or -)(operand char) → "$1 $2 $3"
  // Apply berulang untuk handle chain
  for (let i = 0; i < 3; i++) {
    r = r.replace(/([0-9a-zA-Zπ²³⁴⁵⁶⁷⁸⁹⁰\)])\s*([+\-])\s*([0-9a-zA-Zπ\(])/g, "$1 $2 $3");
  }
  // Space sekitar =
  r = r.replace(/\s*=\s*/g, " = ");

  return r;
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
