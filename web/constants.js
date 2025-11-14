// Shared Constants
// This module exports all shared constants used throughout the application.
// This provides a single source of truth for magic strings and default values.

// Re-export DEFAULT_CLASS_START_DATE from date-utils.js for consistency
export { DEFAULT_CLASS_START_DATE } from './date-utils.js';

// Lesson-related constants
export const DEFAULT_LESSON_TITLE = "Empty Lesson";
export const UNTITLED_LESSON = "(Untitled)";
export const UNTITLED_LESSON_LOWERCASE = "(untitled)"; // Used in some places
export const NO_CONTENT_SELECTED = "(No content selected)";

// Content-related constants
export const CONTENT_NOT_FOUND = "Content not found.";
export const NO_CONTENT_FOR_TODAY = "No content for today.";

// Database path constants
export const DB_PATHS = {
	SCHEDULE: "schedule/",
	CONTENT: "content/",
	CLASSES: "classes/",
};

/**
 * Build a database path from path segments
 * @param {...string} segments - Path segments to join together
 * @returns {string} The joined path string
 * @example
 * buildPath("schedule", "class1", "0") // Returns "schedule/class1/0"
 */
export function buildPath(...segments) {
	return segments.filter(Boolean).join("/");
}

