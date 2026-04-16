import Link from "next/link";
import { notFound } from "next/navigation";
import { DAFTAR_MATERI, cariSubMateri } from "@/data/materi";
import { TombolJelaskanVisual } from "@/components/TombolJelaskanVisual";
import { DaftarSoal } from "@/components/DaftarSoal";

export default async function SubMateriPage({
  params,
}: {
  params: Promise<{ slug: string; sub: string }>;
}) {
  const { slug, sub } = await params;
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  const subMateri = cariSubMateri(slug, sub);
  if (!materi || !subMateri) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href={`/materi/${slug}`} className="text-sm text-blue-600 hover:underline">
        ← {materi.nama}
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">{subMateri.nama}</h1>
      <p className="text-gray-600 mb-6">{subMateri.ringkasan}</p>

      <section className="prose max-w-none mb-8">
        <h2>Materi</h2>
        <p>{subMateri.konten}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contoh Soal</h2>
        {subMateri.contohSoal.length === 0 ? (
          <p className="text-gray-500 italic">Contoh soal belum diisi.</p>
        ) : (
          subMateri.contohSoal.map((c, i) => (
            <div key={i} className="p-4 border rounded-lg mb-4">
              <p className="font-medium mb-2">Soal {i + 1}: {c.soal}</p>
              <ol className="list-decimal ml-5 text-sm text-gray-700">
                {c.pembahasan.map((p, j) => <li key={j}>{p}</li>)}
              </ol>
              <TombolJelaskanVisual konsep={subMateri.nama} konteks={c.soal} />
            </div>
          ))
        )}
      </section>

      <section className="mt-6">
        <DaftarSoal materiSlug={slug} subMateriSlug={sub} />
      </section>
    </main>
  );
}
