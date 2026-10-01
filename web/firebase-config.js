// Centralized Firebase Configuration
// This module initializes Firebase once and exports the database instance
// for use across all modules, ensuring a single source of truth for Firebase configuration.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase configuration
const FIREBASE_CONFIG = {
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
};

// Initialize Firebase app (singleton pattern - initializeApp is idempotent)
const app = initializeApp(FIREBASE_CONFIG);

/**
 * Firebase Realtime Database instance
 * @type {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database}
 */
export const db = getDatabase(app);

// Local dev only: redirect all reads/writes to the Database emulator instead
// of the real production database, mirroring teacher-auth.js's existing
// localhost-only dev-bypass pattern. Never active off localhost/127.0.0.1, so
// this can't accidentally point a deployed build at the emulator.
if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
	connectDatabaseEmulator(db, window.location.hostname, 9000);
}

/**
 * Firebase App instance
 * @type {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js").FirebaseApp}
 */
export { app };

