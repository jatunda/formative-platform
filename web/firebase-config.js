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

// Get and export the database instance
export const db = getDatabase(app);

// Export the app instance in case it's needed elsewhere
export { app };

