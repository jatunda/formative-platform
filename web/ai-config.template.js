// Configuration template for AI Generation
// 
// SETUP INSTRUCTIONS:
// 1. Copy this file to ai-config.js
// 2. Get an OpenAI API key from https://platform.openai.com/api-keys
// 3. Replace 'your-openai-api-key-here' with your actual API key
// 4. The actual ai-config.js file will be ignored by git for security

export const AI_CONFIG = {
  OPENAI_API_KEY: 'your-openai-api-key-here', // TODO: Replace with your actual API key
  
  // You can change these settings if needed
  MODEL: 'gpt-3.5-turbo', // Uses cheaper model for MVP - change to 'gpt-4' for better quality
  MAX_TOKENS: 1000,       // Maximum response length
  TEMPERATURE: 0.7,       // Creativity level (0.0 = deterministic, 1.0 = very creative)
};

// Validation function
export function validateConfig() {
  if (!AI_CONFIG.OPENAI_API_KEY || AI_CONFIG.OPENAI_API_KEY === 'your-openai-api-key-here') {
    throw new Error('OpenAI API key not configured. Please update ai-config.js with your actual API key.');
  }
}
