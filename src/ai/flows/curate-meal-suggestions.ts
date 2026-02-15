'use server';

/**
 * @fileOverview Machine Learning Recommendation Model for delivery curation.
 * 
 * - curateMealSuggestions - Acts as a scoring engine to rank delivery items.
 * - Includes rule-based fallback for 429 quota handling.
 */

import { executeWithRotation } from '@/ai/genkit';
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
  ingredients: z.array(z.string()).describe("List of main ingredients in the dish."),
});

const SuggestionSchema = DeliveryItemSchema.extend({
  reasoning: z.string().max(200).describe("ML-based reasoning for the recommendation. MAX 200 chars."),
});

const CurateMealSuggestionsInputSchema = z.object({
  userProfile: z.object({
    bmiCategory: z.string().optional(),
    dietaryRestrictions: z.array(z.string().optional()).optional(),
    allergies: z.string().optional(),
    calorieTarget: z.number().optional(),
  }),
  scrapedDatabase: z.array(DeliveryItemSchema).describe("The database of scraped items to filter from."),
});
export type CurateMealSuggestionsInput = z.infer<typeof CurateMealSuggestionsInputSchema>;

const CurateMealSuggestionsOutputSchema = z.object({
  topMatches: z.array(SuggestionSchema),
});
export type CurateMealSuggestionsOutput = z.infer<typeof CurateMealSuggestionsOutputSchema>;

export async function curateMealSuggestions(input: CurateMealSuggestionsInput): Promise<CurateMealSuggestionsOutput> {
  try {
    return await executeWithRotation(async (aiInstance) => {
      const prompt = aiInstance.definePrompt({
        name: 'curateMealSuggestionsPrompt',
        input: { schema: CurateMealSuggestionsInputSchema },
        output: { schema: CurateMealSuggestionsOutputSchema },
        prompt: `You are the NutriPal V1 Machine Learning Recommendation Engine. 
Your objective is to execute a multi-variable scoring algorithm to rank food items.

User Input Vector:
- BMI: {{#if userProfile.bmiCategory}}{{{userProfile.bmiCategory}}}{{else}}Standard{{/if}}
- Constraints: {{#if userProfile.dietaryRestrictions}}{{{userProfile.dietaryRestrictions}}}{{else}}None{{/if}}
- Allergies: {{#if userProfile.allergies}}{{{userProfile.allergies}}}{{else}}None{{/if}}
- Target Scalar: {{{userProfile.calorieTarget}}} kcal

DATABASE OF ITEMS:
{{#each scrapedDatabase}}
- ID: {{id}}, Name: {{name}}, Restaurant: {{restaurant}}, Price: {{price}}, Platform: {{platform}}, Kcal: {{calories}}, Health: {{healthScore}}, Tags: {{tags}}, Ingredients: {{ingredients}}
{{/each}}

MODEL LOGIC:
1. Provide exactly 2 items: 1 from GrabFood and 1 from GoFood.
2. Hard exclusion on "Allergies".
3. Reward match on "Constraints".
4. Identify and include "ingredients" for each item.
5. CRITICAL: "reasoning" MUST BE EXTREMELY CONCISE (MAX 150 chars).

Provide the pair with highest calculated scores.`,
      });

      const { output } = await prompt(input);
      if (!output) throw new Error("AI failed to filter delivery data.");
      return output as CurateMealSuggestionsOutput;
    });
  } catch (error: any) {
    console.warn('AI Quota or Rotation error. Using Rule-Based Fallback for Delivery Hub.', error);
    return ruleBasedDeliveryFallback(input);
  }
}

function ruleBasedDeliveryFallback(input: CurateMealSuggestionsInput): CurateMealSuggestionsOutput {
  const { userProfile, scrapedDatabase } = input;
  const targetCals = (userProfile.calorieTarget || 2000) / 3;
  
  const grabItems = scrapedDatabase.filter(item => item.platform === 'GrabFood');
  const goItems = scrapedDatabase.filter(item => item.platform === 'GoFood');

  const filterFn = (item: any) => {
    if (userProfile.allergies && item.name.toLowerCase().includes(userProfile.allergies.toLowerCase())) return false;
    if (userProfile.dietaryRestrictions?.length) {
      const match = userProfile.dietaryRestrictions.some(res => item.tags.includes(res!));
      if (!match) return false;
    }
    return true;
  };

  const bestGrab = grabItems.filter(filterFn).sort((a, b) => Math.abs(a.calories - targetCals) - Math.abs(b.calories - targetCals))[0];
  const bestGo = goItems.filter(filterFn).sort((a, b) => Math.abs(a.calories - targetCals) - Math.abs(b.calories - targetCals))[0];

  const results = [];
  if (bestGrab) results.push({ ...bestGrab, reasoning: "Fallback: Best Grab matching calorie proximity." });
  if (bestGo) results.push({ ...bestGo, reasoning: "Fallback: Best GoFood matching calorie proximity." });

  return { topMatches: results as any };
}
