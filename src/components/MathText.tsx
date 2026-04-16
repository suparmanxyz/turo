"use client";

import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export function MathText({ children }: { children: string }) {
  const parts = split(children);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "block") return <BlockMath key={i} math={p.content} />;
        if (p.type === "inline") return <InlineMath key={i} math={p.content} />;
        return <span key={i}>{p.content}</span>;
      })}
    </>
  );
}

type Part = { type: "text" | "inline" | "block"; content: string };

function split(s: string): Part[] {
  const out: Part[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "$" && s[i + 1] === "$") {
      const end = s.indexOf("$$", i + 2);
      if (end === -1) {
        out.push({ type: "text", content: s.slice(i) });
        break;
      }
      out.push({ type: "block", content: s.slice(i + 2, end) });
      i = end + 2;
    } else if (s[i] === "$") {
      const end = s.indexOf("$", i + 1);
      if (end === -1) {
        out.push({ type: "text", content: s.slice(i) });
        break;
      }
      out.push({ type: "inline", content: s.slice(i + 1, end) });
      i = end + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== "$") j++;
      out.push({ type: "text", content: s.slice(i, j) });
      i = j;
    }
  }
  return out;
}
