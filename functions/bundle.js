// Bundles index.js and everything it requires into one file, which is what
// package.json's "main" points at and so what gets deployed. A cold start
// then loads a single file instead of ~300 modules (firebase-functions
// pulls in firebase-admin at import time): about 370 ms -> 105 ms locally.
// See .scratch/preview-function-cold-start/notes.md.
//
// firebase.json runs this before every functions deploy. Run it by hand
// (npm run bundle) before starting the emulators.
const path = require("node:path");
const esbuild = require("esbuild");

const DEFAULT_OUTFILE = path.join(__dirname, "dist", "index.js");

async function bundle({ outfile = DEFAULT_OUTFILE } = {}) {
  await esbuild.build({
    entryPoints: [path.join(__dirname, "index.js")],
    outfile,
    bundle: true,
    platform: "node",
    target: "node22",
    logLevel: "warning",
  });
}

module.exports = { bundle };

if (require.main === module) {
  bundle().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
