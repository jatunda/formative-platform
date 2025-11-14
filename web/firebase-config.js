// Centralized Firebase Configuration
// This module initializes Firebase once and exports the database instance
// for use across all modules, ensuring a single source of truth for Firebase configuration.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

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

/**
 * Firebase App instance
 * @type {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js").FirebaseApp}
 */
export { app };

