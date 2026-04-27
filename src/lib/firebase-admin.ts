import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App;
let firestoreInstance: Firestore | null = null;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum diset");
  const creds = JSON.parse(raw);
  adminApp = initializeApp({ credential: cert(creds) });
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const db = getFirestore(getAdminApp());
  // Auto-ignore undefined fields supaya optional fields (e.g. konten.svg) tidak crash.
  // Try/catch karena hot-reload dev bisa re-import file ini sementara db instance
  // sebenarnya sudah di-settings sebelumnya (settings() hanya boleh dipanggil sekali).
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    if (!String(e).includes("already been initialized")) throw e;
  }
  firestoreInstance = db;
  return db;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
