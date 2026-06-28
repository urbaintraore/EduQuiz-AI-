import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

console.log("Testing new database ID...");

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("Config file missing");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (getApps().length === 0) {
  initializeApp({
    projectId: config.projectId
  });
}

const dbId = config.firestoreDatabaseId || "(default)";
console.log("Database ID:", dbId);

const dbFirestore = getFirestore(getApp(), dbId);
console.log("Attempting write to 'eduquiz_state' -> 'test_doc'...");

dbFirestore.collection("eduquiz_state").doc("test_doc").set({ date: new Date().toISOString() })
  .then(() => {
    console.log("✅ Success! Write succeeded!");
    return dbFirestore.collection("eduquiz_state").doc("test_doc").get();
  })
  .then((doc) => {
    console.log("✅ Success! Read succeeded! Data:", doc.data());
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  });
