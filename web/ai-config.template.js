// Configuration template for AI Generation
//
// SETUP INSTRUCTIONS:
// 1. Copy this file to ai-config.js
// 2. Get an Anthropic API key from https://console.anthropic.com/settings/keys
// 3. Replace 'your-anthropic-api-key-here' with your actual API key
// 4. The actual ai-config.js file will be ignored by git for security

export const AI_CONFIG = {
  ANTHROPIC_API_KEY: 'your-anthropic-api-key-here', // TODO: Replace with your actual API key

  // You can change these settings if needed
  MODEL: 'claude-haiku-4-5-20251001', // Cheapest/fastest Claude tier for MVP - change to 'claude-sonnet-5' or 'claude-opus-5' for better quality
  MAX_TOKENS: 1000,       // Maximum response length
  TEMPERATURE: 0.7,       // Creativity level (0.0 = deterministic, 1.0 = very creative)
};

// Validation function
export function validateConfig() {
  if (!AI_CONFIG.ANTHROPIC_API_KEY || AI_CONFIG.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    throw new Error('Anthropic API key not configured. Please update ai-config.js with your actual API key.');
  }
}
