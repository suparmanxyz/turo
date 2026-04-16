export function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {}

  const fenceClosed = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceClosed) {
    try {
      return JSON.parse(fenceClosed[1].trim());
    } catch {}
  }
  const fenceOpen = text.match(/```(?:json)?\s*([\s\S]*)/);
  if (fenceOpen) {
    try {
      return JSON.parse(fenceOpen[1].trim());
    } catch {}
  }

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
        try {
          return JSON.parse(candidate);
        } catch {
          start = -1;
        }
      }
    }
  }
  throw new Error("No valid JSON object found in response");
}
