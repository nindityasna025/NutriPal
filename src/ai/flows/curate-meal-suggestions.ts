
'use server';

/**
 * @fileOverview Machine Learning Recommendation Model for delivery curation.
 * 
 * - curateMealSuggestions - Acts as a scoring engine to rank delivery items.
 * - Includes rule-based fallback for 429 quota handling.
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
    dietaryRestrictions: z.array(z.string().optional()).optional(),
    allergies: z.string().optional(),
    calorieTarget: z.number().optional(),
  }),
  scrapedDatabase: z.array(DeliveryItemSchema).describe("The database of scraped items to filter from."),
});
export type CurateMealSuggestionsInput = z.infer<typeof CurateMealSuggestionsInputSchema>;

const SuggestionSchema = DeliveryItemSchema.extend({
  reasoning: z.string().max(200).describe("ML-based reasoning for the recommendation. MAX 200 chars."),
});

const CurateMealSuggestionsOutputSchema = z.object({
  topMatches: z.array(SuggestionSchema),
});
export type CurateMealSuggestionsOutput = z.infer<typeof CurateMealSuggestionsOutputSchema>;

export async function curateMealSuggestions(input: CurateMealSuggestionsInput): Promise<CurateMealSuggestionsOutput> {
  try {
    return await curateMealSuggestionsFlow(input);
  } catch (error: any) {
    if (error.message?.includes('429')) {
      console.warn('AI Quota Exceeded. Using Rule-Based Fallback for Delivery Hub.');
      return ruleBasedDeliveryFallback(input);
    }
    throw error;
  }
}

function ruleBasedDeliveryFallback(input: CurateMealSuggestionsInput): CurateMealSuggestionsOutput {
  const { userProfile, scrapedDatabase } = input;
  const targetCals = (userProfile.calorieTarget || 2000) / 3;
  
  const filtered = scrapedDatabase.filter(item => {
    // Basic allergy check
    if (userProfile.allergies && item.name.toLowerCase().includes(userProfile.allergies.toLowerCase())) return false;
    // Dietary restrictions check
    if (userProfile.dietaryRestrictions?.length) {
      const match = userProfile.dietaryRestrictions.some(res => item.tags.includes(res!));
      if (!match) return false;
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => {
    const scoreA = Math.abs(a.calories - targetCals);
    const scoreB = Math.abs(b.calories - targetCals);
    return scoreA - scoreB;
  });

  const top3 = sorted.slice(0, 3).map(item => ({
    ...item,
    reasoning: "Rule-based optimization: Matched based on calorie proximity and profile constraints during AI downtime."
  }));

  return { topMatches: top3 };
}

const prompt = ai.definePrompt({
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
- ID: {{id}}, Name: {{name}}, Restaurant: {{restaurant}}, Price: {{price}}, Platform: {{platform}}, Kcal: {{calories}}, Health: {{healthScore}}, Tags: {{tags}}
{{/each}}

MODEL LOGIC:
1. Hard exclusion on "Allergies".
2. Reward match on "Constraints".
3. CRITICAL: "reasoning" MUST BE EXTREMELY CONCISE (MAX 150 chars). Target 120 chars.

Provide top 3 items with highest calculated scores.`,
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
