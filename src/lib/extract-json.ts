/**
 * Auto-fix LaTeX backslash di dalam JSON string literal.
 * Claude sering output `\sqrt`, `\frac`, dll yang invalid JSON escape.
 * Replace `\X` (X bukan valid JSON escape) dengan `\\X` di dalam string literal.
 *
 * Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
 * Untuk LaTeX, prefer over-escape (false positive jarang masalah karena
 * LaTeX tidak biasa pakai control chars literal).
 */
function fixLatexBackslash(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!inString) {
      out += c;
      if (c === '"') inString = true;
      continue;
    }
    // Di dalam string literal
    if (c === '"') {
      inString = false;
      out += c;
      continue;
    }
    if (c === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      // Valid JSON escape — keep as-is
      if ('"\\/'.includes(next) || "bfnrtu".includes(next)) {
        out += c + next;
        i++;
        continue;
      }
      // Invalid — double-escape (assume LaTeX command)
      out += "\\\\" + next;
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

function tryParseWithFix(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {}
  // Fallback: auto-fix LaTeX backslash, retry
  try {
    return JSON.parse(fixLatexBackslash(s));
  } catch {}
  return undefined;
}

export function extractJson(text: string): unknown {
  const r1 = tryParseWithFix(text);
  if (r1 !== undefined) return r1;

  const fenceClosed = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceClosed) {
    const r = tryParseWithFix(fenceClosed[1].trim());
    if (r !== undefined) return r;
  }
  const fenceOpen = text.match(/```(?:json)?\s*([\s\S]*)/);
  if (fenceOpen) {
    const r = tryParseWithFix(fenceOpen[1].trim());
    if (r !== undefined) return r;
  }

  // Brace-balance fallback
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1);
        const r = tryParseWithFix(candidate);
        if (r !== undefined) return r;
        start = -1;
      }
    }
  }
  throw new Error("No valid JSON object found in response");
}
