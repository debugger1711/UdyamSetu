/**
 * Gemini AI Client Stub
 * 
 * Note: Will interface with Google Generative AI SDK in the AI module step.
 * All Gemini calls will remain strictly server-side.
 */

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || "";

  return {
    isAvailable: Boolean(apiKey),
  };
}
