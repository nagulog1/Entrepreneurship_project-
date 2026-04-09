/* eslint-disable no-console */

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { EVENTS } from "../src/lib/data/events";
import { CHALLENGES } from "../src/lib/data/challenges";

type HasId = { id: string };

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    "demo-unio"
  );
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const projectId = getProjectId();
  const useFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (useFirestoreEmulator) {
    initializeApp({ projectId });
    return;
  }

  // Uses Application Default Credentials.
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file.
  initializeApp({
    projectId,
    credential: applicationDefault(),
  });
}

async function upsertCollection<T extends HasId>(
  collectionName: string,
  docs: T[]
) {
  const db = getFirestore();
  const col = db.collection(collectionName);

  console.log(`\n📦 Seeding '${collectionName}' (${docs.length} docs)...`);

  // Firestore batch writes are limited to 500 operations.
  const BATCH_LIMIT = 450;

  let batch = db.batch();
  let batchOps = 0;
  let committed = 0;

  for (const doc of docs) {
    const ref = col.doc(doc.id);
    batch.set(ref, doc, { merge: true });
    batchOps += 1;

    if (batchOps >= BATCH_LIMIT) {
      await batch.commit();
      committed += batchOps;
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    committed += batchOps;
  }

  console.log(`✅ Seeded '${collectionName}' (${committed} writes).`);
}

async function main() {
  initFirebaseAdmin();

  const projectId = getProjectId();
  const useFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  console.log("🌱 Firebase seed starting...");
  console.log(`- Project: ${projectId}`);
  console.log(
    `- Firestore: ${useFirestoreEmulator ? "emulator" : "real project"}`
  );

  await upsertCollection("events", EVENTS);
  await upsertCollection("challenges", CHALLENGES);

  console.log("\n🎉 Done.");
}

main().catch((err) => {
  console.error("\n❌ Seed failed.");
  console.error(err);
  console.error(
    "\nIf you're seeding a real Firebase project locally, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file.\n" +
      "If you're seeding the Firestore emulator, set FIRESTORE_EMULATOR_HOST (for example: 127.0.0.1:8080)."
  );
  process.exitCode = 1;
});
