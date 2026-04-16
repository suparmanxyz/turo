"use client";

import { useState } from "react";
import { MathText } from "./MathText";

type Pesan = { role: "user" | "assistant"; content: string };

export function ChatTahap({
  soal,
  langkahSebelumnya,
  langkahIni,
  penjelasanTambahan,
  onTutup,
}: {
  soal: string;
  langkahSebelumnya: string[];
  langkahIni: string;
  penjelasanTambahan: string[];
  onTutup: () => void;
}) {
  const [messages, setMessages] = useState<Pesan[]>([
    {
      role: "assistant",
      content: "Halo! Saya di sini untuk bantu kamu memahami langkah ini. Apa yang ingin kamu tanyakan? Misal: \"apa itu mod?\", \"kenapa dibagi 24?\", dll.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function kirim() {
    const teks = input.trim();
    if (!teks || loading) return;
    const baru: Pesan[] = [...messages, { role: "user", content: teks }];
    setMessages(baru);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat-pembahasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soal,
          langkahSebelumnya,
          langkahIni,
          penjelasanTambahan,
          messages: baru,
        }),
      });
      const data = await r.json();
      setMessages([...baru, { role: "assistant", content: data.reply ?? "(gagal menjawab)" }]);
    } catch (e) {
      setMessages([...baru, { role: "assistant", content: `(gagal: ${e instanceof Error ? e.message : e})` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 p-3 border-2 border-blue-300 rounded-lg bg-white">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-blue-700">💬 Tanya AI tentang langkah ini</h4>
        <button onClick={onTutup} className="text-xs text-gray-500 underline">Tutup</button>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={
                "inline-block max-w-[90%] px-3 py-2 rounded text-sm " +
                (m.role === "user" ? "bg-blue-600 text-white" : "bg-white border")
              }
            >
              <MathText>{m.content}</MathText>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="inline-block px-3 py-2 text-sm text-gray-500">AI sedang mengetik...</div>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              kirim();
            }
          }}
          placeholder="Tulis pertanyaan... (Enter untuk kirim)"
          disabled={loading}
          className="flex-1 px-3 py-2 border rounded text-sm"
          autoFocus
        />
        <button
          onClick={kirim}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}
