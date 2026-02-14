'use server';

/**
 * @fileOverview AI flow for curating meal suggestions from a database of scraped delivery data.
 * 
 * - curateMealSuggestions - Filters a database of food items based on user profile metrics.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeliveryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  restaurant: z.string(),
  price: z.string(),
  platform: z.enum(['GrabFood', 'GoFood']),
  calories: z.number(),
  macros: z.object({
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  healthScore: z.number(),
  tags: z.array(z.string()),
});

const CurateMealSuggestionsInputSchema = z.object({
  userProfile: z.object({
    bmiCategory: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.string().optional(),
    calorieTarget: z.number().optional(),
  }),
  scrapedDatabase: z.array(DeliveryItemSchema).describe("The database of scraped items to filter from."),
});
export type CurateMealSuggestionsInput = z.infer<typeof CurateMealSuggestionsInputSchema>;

const SuggestionSchema = DeliveryItemSchema.extend({
  reasoning: z.string().max(200).describe("Why this meal was chosen for the user's specific profile."),
});

const CurateMealSuggestionsOutputSchema = z.object({
  topMatches: z.array(SuggestionSchema),
});
export type CurateMealSuggestionsOutput = z.infer<typeof CurateMealSuggestionsOutputSchema>;

export async function curateMealSuggestions(input: CurateMealSuggestionsInput): Promise<CurateMealSuggestionsOutput> {
  return curateMealSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'curateMealSuggestionsPrompt',
  input: { schema: CurateMealSuggestionsInputSchema },
  output: { schema: CurateMealSuggestionsOutputSchema },
  prompt: `You are a Smart Delivery Decision Maker. 
Your goal is to filter the provided database of scraped food items to find the TOP 3 best matches for the user.

User Profile:
- Category: {{#if userProfile.bmiCategory}}{{{userProfile.bmiCategory}}}{{else}}Standard{{/if}}
- Restrictions: {{#if userProfile.dietaryRestrictions}}{{{userProfile.dietaryRestrictions}}}{{else}}None{{/if}}
- Allergies: {{#if userProfile.allergies}}{{{userProfile.allergies}}}{{else}}None{{/if}}
- Daily Calorie Goal: {{{userProfile.calorieTarget}}} kcal

DATABASE OF SCRAPED ITEMS:
{{#each scrapedDatabase}}
- ID: {{id}}, Name: {{name}}, Restaurant: {{restaurant}}, Price: {{price}}, Platform: {{platform}}, Kcal: {{calories}}, Health: {{healthScore}}, Tags: {{tags}}
{{/each}}

CRITICAL RULES:
1. Filter out items that contain the user's allergies.
2. Prioritize items that match dietary restrictions (e.g., if Vegetarian, only pick Vegetarian).
3. If the user is "Overweight" or "Obese", prioritize items with <500kcal and higher Health Scores.
4. If the user is "Underweight", prioritize items with higher protein and moderate calories.
5. Provide a "reasoning" for each pick that explains how it aligns with their BMI category or goal. Max 200 chars.

Provide the top 3 matches in the specified JSON format.`,
});

const curateMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'curateMealSuggestionsFlow',
    inputSchema: CurateMealSuggestionsInputSchema,
    outputSchema: CurateMealSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to filter delivery data.");
    return output;
  }
);
