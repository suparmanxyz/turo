import Link from "next/link";
import { notFound } from "next/navigation";
import { DAFTAR_MATERI } from "@/data/materi";
import { temaUntukMateri } from "@/lib/kategori-tema";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL, type Audiens } from "@/types";
import { SubMateriDinamis } from "@/components/SubMateriDinamis";

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

      <SubMateriDinamis
        materiSlug={materi.slug}
        materiNama={materi.nama}
        audiens={
          {
            kategoriUtama: materi.kategoriUtama,
            jenjang: materi.jenjang,
            kelas: materi.kelas,
          } satisfies Audiens
        }
        defaultSubMateri={materi.subMateri}
        defaultElemen={materi.elemen}
        temaKey={{ kategoriUtama: materi.kategoriUtama, jenjang: materi.jenjang }}
      />
    </main>
  );
}
