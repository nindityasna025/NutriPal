
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
 */
export async function executeWithRotation(fn: (aiInstance: any) => Promise<any>) {
  let lastError: any = null;

  for (const key of GEMINI_KEYS) {
    try {
      // Create a temporary instance with the key being tried
      const temporaryAi = genkit({
        plugins: [googleAI({ apiKey: key })],
        model: 'googleai/gemini-2.5-flash',
      });
      return await fn(temporaryAi);
    } catch (error: any) {
      lastError = error;
      // If error 429 (Rate Limit), continue to the next key
      if (error.message?.includes('429') || error.status === 429) {
        console.warn(`Key rotation triggered: Current key rate limited, trying next...`);
        continue;
      }
      // If any other error, throw immediately
      throw error;
    }
  }
  throw lastError;
}
