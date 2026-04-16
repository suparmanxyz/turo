// Jalankan: npx tsx scripts/test-firebase.ts
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  console.log("=== Cek ENV ===");
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "ANTHROPIC_API_KEY",
  ];
  for (const k of required) {
    const v = process.env[k];
    const status = v && !v.includes("GANTI_DENGAN_KEY_BARU") ? "✓" : "✗";
    console.log(`${status} ${k}: ${v ? v.slice(0, 30) + "..." : "(kosong)"}`);
  }

  console.log("\n=== Cek parse service account JSON ===");
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON!;
    const creds = JSON.parse(raw);
    console.log("✓ JSON valid. project_id:", creds.project_id);
    console.log("  client_email:", creds.client_email);
    console.log("  private_key prefix:", creds.private_key?.slice(0, 30));
  } catch (e) {
    console.log("✗ Gagal parse JSON:", (e as Error).message);
  }

  console.log("\n=== Tes koneksi Firestore (Admin SDK) ===");
  try {
    const { initializeApp, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
    const app = initializeApp({ credential: cert(creds) });
    const db = getFirestore(app);
    const testRef = db.collection("_test").doc("ping");
    await testRef.set({ at: new Date().toISOString() });
    const snap = await testRef.get();
    console.log("✓ Tulis & baca Firestore sukses:", snap.data());
    await testRef.delete();
  } catch (e) {
    console.log("✗ Gagal:", (e as Error).message);
  }
}

main();
