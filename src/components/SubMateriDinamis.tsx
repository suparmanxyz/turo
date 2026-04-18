"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Audiens, Elemen, KategoriUtama, Jenjang, SubMateri } from "@/types";
import { ELEMEN_LABEL } from "@/types";
import { TEMA_JENJANG, TEMA_KATEGORI_UTAMA } from "@/lib/kategori-tema";

type SubTopikAi = {
  slug: string;
  nama: string;
  ringkasan: string;
};

type Props = {
  materiSlug: string;
  materiNama: string;
  audiens: Audiens;
  defaultSubMateri: SubMateri[];
  defaultElemen?: Elemen;
  /** Plain key untuk pilih palette — dipisah supaya tidak pass function dari server. */
  temaKey: { kategoriUtama: KategoriUtama; jenjang?: Jenjang };
};

export function SubMateriDinamis({
  materiSlug,
  materiNama,
  audiens,
  defaultSubMateri,
  defaultElemen,
  temaKey,
}: Props) {
  const t =
    temaKey.kategoriUtama === "snbt"
      ? TEMA_KATEGORI_UTAMA.snbt
      : temaKey.kategoriUtama === "olimpiade"
      ? TEMA_KATEGORI_UTAMA.olimpiade
      : temaKey.jenjang
      ? TEMA_JENJANG[temaKey.jenjang]
      : TEMA_KATEGORI_UTAMA.reguler;
  // Mulai dengan default (sebelum AI fetch). Default = SubMateri "konsep" yang sudah di kode.
  const [subList, setSubList] = useState<{ slug: string; nama: string; ringkasan: string; elemen?: Elemen }[]>(
    defaultSubMateri.map((s) => ({ slug: s.slug, nama: s.nama, ringkasan: s.ringkasan, elemen: s.elemen })),
  );
  const [memuatAi, setMemuatAi] = useState(true);
  const [diGenerate, setDiGenerate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/generate-sub-topik", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materiSlug, materiNama, ...audiens }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: { subTopik: SubTopikAi[]; _cached?: boolean } = await r.json();
        if (cancelled) return;
        if (data.subTopik && data.subTopik.length > 0) {
          setSubList(
            data.subTopik.map((s) => ({
              slug: s.slug,
              nama: s.nama,
              ringkasan: s.ringkasan,
              elemen: defaultElemen,
            })),
          );
          setDiGenerate(!data._cached);
        }
      } catch (e) {
        console.warn("Gagal fetch sub-topik:", e);
      } finally {
        if (!cancelled) setMemuatAi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materiSlug, materiNama, audiens.kategoriUtama, audiens.jenjang, audiens.kelas, defaultElemen]);

  return (
    <>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${t.gradient}`} />
        Sub-materi
        {memuatAi && (
          <span className="ml-2 text-xs font-normal text-slate-500 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            menyusun…
          </span>
        )}
        {diGenerate && !memuatAi && (
          <span className="ml-2 text-[10px] font-normal text-slate-400 uppercase tracking-wider">baru di-generate AI</span>
        )}
      </h2>

      {subList.length === 0 ? (
        <div className={`rounded-2xl border-2 border-dashed ${t.border} ${t.bgSoft} p-10 text-center`}>
          <div className="text-4xl mb-2">{t.emoji}</div>
          <p className={`font-semibold ${t.textStrong}`}>Sub-materi sedang disiapkan</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {subList.map((s, i) => (
            <Link
              key={s.slug}
              href={`/materi/${materiSlug}/${s.slug}`}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-pop"
            >
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.bgSoftStrong} ${t.text} text-sm font-bold`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold group-hover:text-brand transition">{s.nama}</h3>
                  {s.elemen && (
                    <span className={`inline-flex items-center text-[10px] uppercase tracking-wider rounded-full ${t.badge} px-2 py-0.5 font-medium`}>
                      {ELEMEN_LABEL[s.elemen]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{s.ringkasan}</p>
              </div>
              <span className={`opacity-0 group-hover:opacity-100 transition ${t.text} font-medium text-sm`}>→</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
