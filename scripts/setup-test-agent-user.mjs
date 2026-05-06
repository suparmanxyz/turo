// One-time setup: bikin user fake di Firebase Auth untuk test agent.
// Output: UID — copy ke .env.local sebagai TEST_AGENT_UID
//
// Usage: node scripts/setup-test-agent-user.mjs

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

function loadEnv() {
  const p = resolve(import.meta.dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON missing");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const EMAIL = "test-agent@turo.local";
const DISPLAY_NAME = "Test Agent (Automated)";

let user;
try {
  user = await admin.auth().getUserByEmail(EMAIL);
  console.log(`✓ Existing user: ${user.uid}`);
} catch (err) {
  if (err.code === "auth/user-not-found") {
    user = await admin.auth().createUser({
      email: EMAIL,
      emailVerified: true,
      displayName: DISPLAY_NAME,
      disabled: false,
    });
    console.log(`✓ Created new user: ${user.uid}`);
  } else {
    throw err;
  }
}

console.log(`\n=== ADD KE .env.local ===`);
console.log(`TEST_AGENT_UID=${user.uid}`);
console.log(`TEST_AGENT_EMAIL=${EMAIL}`);
process.exit(0);
