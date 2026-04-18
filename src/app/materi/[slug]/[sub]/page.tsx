import Link from "next/link";
import { notFound } from "next/navigation";
import { DAFTAR_MATERI, cariSubMateri } from "@/data/materi";
import { TombolJelaskanVisual } from "@/components/TombolJelaskanVisual";
import { DaftarSoal } from "@/components/DaftarSoal";
import { temaUntukMateri } from "@/lib/kategori-tema";
import { cariSubTopikDariCache } from "@/lib/sub-topik";
import { ELEMEN_LABEL, type Audiens, type SubMateri } from "@/types";

export default async function SubMateriPage({
  params,
}: {
  params: Promise<{ slug: string; sub: string }>;
}) {
  const { slug, sub } = await params;
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  if (!materi) notFound();

  // Coba lookup di kode statis dulu
  let subMateri: SubMateri | undefined = cariSubMateri(slug, sub);

  // Fallback: lookup di Firestore subTopikCache (untuk sub-topik AI generated)
  if (!subMateri) {
    const cached = await cariSubTopikDariCache(slug, sub);
    if (cached) {
      subMateri = {
        slug: cached.slug,
        nama: cached.nama,
        ringkasan: cached.ringkasan,
        konten: cached.ringkasan,
        elemen: materi.elemen,
        contohSoal: [],
      };
    }
  }

  if (!subMateri) notFound();

  const t = temaUntukMateri(materi);
  const audiens: Audiens = {
    kategoriUtama: materi.kategoriUtama,
    jenjang: materi.jenjang,
    kelas: materi.kelas,
  };

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <Link
        href={`/materi/${slug}`}
        className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition"
      >
        ← {materi.nama}
      </Link>

      <div className="mt-3 mb-6 animate-rise">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full ${t.badge} px-2.5 py-1 text-xs font-medium`}>
            {t.emoji} {materi.nama}
          </span>
          {subMateri.elemen && (
            <span className={`inline-flex items-center text-[10px] uppercase tracking-wider rounded-full ${t.badge} px-2 py-0.5 font-medium`}>
              {ELEMEN_LABEL[subMateri.elemen]}
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-3">{subMateri.nama}</h1>
        <p className="text-slate-600 mt-2">{subMateri.ringkasan}</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href={`/latihan/${slug}/${sub}`}
          className={`inline-flex items-center gap-2 rounded-xl ${t.gradient} ${t.shadow} text-white px-5 py-2.5 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all`}
        >
          ▶ Mulai latihan
        </Link>
      </div>

      <section className={`mb-8 rounded-2xl border ${t.border} ${t.bgSoft} p-5 sm:p-6`}>
        <h2 className={`text-sm font-bold uppercase tracking-wider mb-2 ${t.textStrong}`}>Materi</h2>
        <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">{subMateri.konten}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${t.gradient}`} />
          Contoh Soal
        </h2>
        {subMateri.contohSoal.length === 0 ? (
          <p className="text-slate-500 italic">Contoh soal belum diisi.</p>
        ) : (
          <div className="space-y-4">
            {subMateri.contohSoal.map((c, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm animate-pop"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${t.bgSoftStrong} ${t.text} text-xs font-bold`}>
                    {i + 1}
                  </span>
                  <p className="font-medium leading-relaxed">{c.soal}</p>
                </div>
                <ol className="list-decimal ml-10 text-sm text-slate-700 space-y-1">
                  {c.pembahasan.map((p, j) => <li key={j}>{p}</li>)}
                </ol>
                <div className="mt-3 ml-10">
                  <TombolJelaskanVisual
                    konsep={subMateri.nama}
                    konteks={c.soal}
                    audiens={audiens}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <DaftarSoal materiSlug={slug} subMateriSlug={sub} />
      </section>
    </main>
  );
}
