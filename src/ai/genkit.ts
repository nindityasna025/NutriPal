import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * GEMINI KEY ROTATION SYSTEM
 * Protects the application from rate limits by automatically rotating 5 API Keys.
 */
const GEMINI_KEYS = [
  'AIzaSyD322botPVtW_XFxiy0c49ATAXAgVA2mBs',
  'AIzaSyD4EOt7Pic7IRTLkOaNv3ReX-c3Dj6PfFs',
  'AIzaSyDJVhruvmFbgL8jEByyMCztB0lMdXYwFIs',
  'AIzaSyC60_6CRZOqVp9VbaFTCn5t1QdDlSr1PCI',
  'AIzaSyC5Pr2k6Twe36YtmPknlDmFjCvbnb5q12I'
];

// Initialize using the first key by default
export const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_KEYS[0] })],
  model: 'googleai/gemini-2.5-flash',
});

/**
 * Wrapper function to execute AI commands with key rotation mechanism.
 * Catch 429 Quota errors and retry with the next key in the pool.
 */
export async function executeWithRotation(fn: (aiInstance: any) => Promise<any>) {
  let lastError: any = null;

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const key = GEMINI_KEYS[i];
    try {
      // Create a temporary instance with the key being tried
      const temporaryAi = genkit({
        plugins: [googleAI({ apiKey: key })],
        model: 'googleai/gemini-2.5-flash',
      });
      return await fn(temporaryAi);
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message?.toLowerCase() || "";
      const isRateLimit = errorMessage.includes('429') || 
                          errorMessage.includes('quota') || 
                          errorMessage.includes('rate limit') ||
                          error.status === 429 ||
                          (error as any).code === 429;

      if (isRateLimit && i < GEMINI_KEYS.length - 1) {
        console.warn(`Key ${i + 1} rate limited. Rotating to key ${i + 2}...`);
        continue;
      }
      // If it's the last key or not a rate limit, throw the error
      throw error;
    }
  }
  throw lastError;
}
