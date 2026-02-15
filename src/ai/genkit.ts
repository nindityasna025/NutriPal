import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * GEMINI KEY ROTATION SYSTEM
 * Melindungi aplikasi dari rate limit dengan merotasi 5 API Key secara otomatis.
 */
const GEMINI_KEYS = [
  'AIzaSyD322botPVtW_XFxiy0c49ATAXAgVA2mBs',
  'AIzaSyD4EOt7Pic7IRTLkOaNv3ReX-c3Dj6PfFs',
  'AIzaSyDJVhruvmFbgL8jEByyMCztB0lMdXYwFIs',
  'AIzaSyC60_6CRZOqVp9VbaFTCn5t1QdDlSr1PCI',
  'AIzaSyC5Pr2k6Twe36YtmPknlDmFjCvbnb5q12I'
];

// Inisialisasi default menggunakan key pertama
export const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_KEYS[0] })],
  model: 'googleai/gemini-2.5-flash',
});

/**
 * Fungsi pembungkus untuk menjalankan perintah AI dengan mekanisme rotasi key.
 */
export async function executeWithRotation(fn: (aiInstance: any) => Promise<any>) {
  let lastError: any = null;

  for (const key of GEMINI_KEYS) {
    try {
      // Buat instance sementara dengan key yang sedang dicoba
      const temporaryAi = genkit({
        plugins: [googleAI({ apiKey: key })],
        model: 'googleai/gemini-2.5-flash',
      });
      return await fn(temporaryAi);
    } catch (error: any) {
      lastError = error;
      // Jika error 429 (Rate Limit), lanjutkan ke key berikutnya
      if (error.message?.includes('429') || error.status === 429) {
        console.warn(`Key rotation triggered: Current key rate limited, trying next...`);
        continue;
      }
      // Jika error lain, langsung lempar
      throw error;
    }
  }
  throw lastError;
}
