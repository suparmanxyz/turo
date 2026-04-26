import Link from "next/link";
import { notFound } from "next/navigation";
import { DAFTAR_MATERI } from "@/data/materi";
import { temaUntukMateri } from "@/lib/kategori-tema";
import { ELEMEN_LABEL, JENJANG_LABEL, KATEGORI_UTAMA_LABEL } from "@/types";

function konteksLabel(m: ReturnType<typeof DAFTAR_MATERI.find> & object): string {
  if (m.kategoriUtama === "snbt") return KATEGORI_UTAMA_LABEL.snbt;
  if (m.kategoriUtama === "olimpiade")
    return `${KATEGORI_UTAMA_LABEL.olimpiade}${m.jenjang ? ` · ${JENJANG_LABEL[m.jenjang]}` : ""}`;
  // reguler
  const parts = [KATEGORI_UTAMA_LABEL.reguler];
  if (m.jenjang) parts.push(JENJANG_LABEL[m.jenjang]);
  if (m.kelas) parts.push(`Kelas ${m.kelas}`);
  return parts.join(" · ");
}

export default async function MateriPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  if (!materi) notFound();

  const t = temaUntukMateri(materi);
  const Icon = t.Icon;

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-10">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition"
      >
        ← Kembali
      </Link>

      <div className={`relative overflow-hidden rounded-3xl ${t.gradient} ${t.shadow} shadow-xl text-white p-8 mt-3 mb-6 animate-rise`}>
        <div className="absolute inset-0 opacity-90"><t.Ornament /></div>
        <div className="relative flex items-start gap-5">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur p-3 ring-1 ring-white/30">
            <Icon />
          </div>
          <div>
            <div className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">
              {konteksLabel(materi)}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">{materi.nama}</h1>
            <p className="text-white/85 mt-2 max-w-2xl">{materi.deskripsi}</p>
          </div>
        </div>
      </div>

      <Link
        href={`/diagnostic/${materi.slug}`}
        className={`mb-8 group block rounded-2xl border-2 ${t.border} ${t.bgSoft} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all`}
      >
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t.bgSoftStrong} text-2xl`}>
            🎯
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold ${t.textStrong}`}>Cek Kesiapan dulu</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Tes adaptif untuk pastikan kamu siap mempelajari materi ini — kalau ada konsep yang lemah, kami bantu petakan.
            </p>
          </div>
          <span className={`shrink-0 ${t.text} font-semibold opacity-0 group-hover:opacity-100 transition`}>→</span>
        </div>
      </Link>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${t.gradient}`} />
        Sub-materi
        <span className="text-sm text-slate-400 font-normal">({materi.subMateri.length})</span>
      </h2>

      {materi.subMateri.length === 0 ? (
        <div className={`rounded-2xl border-2 border-dashed ${t.border} ${t.bgSoft} p-10 text-center`}>
          <div className="text-4xl mb-2">{t.emoji}</div>
          <p className={`font-semibold ${t.textStrong}`}>Sub-materi sedang disiapkan</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {materi.subMateri.map((s, i) => (
            <Link
              key={s.slug}
              href={`/materi/${materi.slug}/${encodeURIComponent(s.slug)}`}
              style={{ animationDelay: `${i * 30}ms` }}
              className="group flex items-start gap-4 rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-pop"
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
                <p className="text-[10px] text-slate-400 mt-1 font-mono">{s.slug}</p>
              </div>
              <span className={`shrink-0 ${t.text} font-semibold opacity-0 group-hover:opacity-100 transition`}>→</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
