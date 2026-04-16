import Link from "next/link";
import { notFound } from "next/navigation";
import { DAFTAR_MATERI } from "@/data/materi";

export default async function MateriPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  if (!materi) notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">← Kembali</Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">{materi.nama}</h1>
      <p className="text-gray-600 mb-6">{materi.deskripsi}</p>

      <h2 className="text-xl font-semibold mb-4">Sub-materi</h2>
      <div className="space-y-3">
        {materi.subMateri.map((s) => (
          <Link
            key={s.slug}
            href={`/materi/${materi.slug}/${s.slug}`}
            className="block p-4 rounded-lg border hover:border-blue-500 transition"
          >
            <h3 className="font-semibold">{s.nama}</h3>
            <p className="text-sm text-gray-600">{s.ringkasan}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
