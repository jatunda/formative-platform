const parseDSL = require("./parseMarkdown");
const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("../firebase-service-account.json"); // You must generate this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database(); // or use admin.firestore() if Firestore

function hashContent(content) {
  return crypto.createHash("md5").update(JSON.stringify(content)).digest("hex");
}

async function uploadFile(filePath) {
  const data = parseDSL(filePath);
  const slug = path.basename(filePath, ".md");
  const hash = hashContent(data);
  const contentRef = db.ref("content");

  const snapshot = await contentRef.orderByChild("hash").equalTo(hash).once("value");

  if (snapshot.exists()) {
    console.log(`[SKIP] Already uploaded: ${slug}`);
    return;
  }

  const newRef = contentRef.push();
  await newRef.set({
    title: data.title,
    blocks: data.blocks,
    createdAt: new Date().toISOString(),
    slug,
    hash,
  });

  console.log(`[OK] Uploaded: ${slug}`);
}

(async () => {
  const folder = "content/";
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".md"));

  for (const file of files) {
    try {
      await uploadFile(path.join(folder, file));
    } catch (e) {
      console.error(`[ERROR] ${file}: ${e.message}`);
    }
  }
  process.exit(0)
})();
