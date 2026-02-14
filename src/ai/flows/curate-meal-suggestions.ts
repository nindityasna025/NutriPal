'use server';

/**
 * @fileOverview Machine Learning Recommendation Model for delivery curation.
 * 
 * - curateMealSuggestions - Acts as a scoring engine to rank delivery items.
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
  reasoning: z.string().max(200).describe("ML-based reasoning for the recommendation. MAX 200 chars."),
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
  prompt: `You are the NutriPal V1 Machine Learning Recommendation Engine. 
Your objective is to execute a multi-variable scoring algorithm to rank food items from the provided database.

User Input Vector:
- BMI Category Weight: {{#if userProfile.bmiCategory}}{{{userProfile.bmiCategory}}}{{else}}Standard{{/if}}
- Filter Constraints (Hard): {{#if userProfile.dietaryRestrictions}}{{{userProfile.dietaryRestrictions}}}{{else}}None{{/if}}
- Exclusion Vector (Allergies): {{#if userProfile.allergies}}{{{userProfile.allergies}}}{{else}}None{{/if}}
- Target Scalar (Calories): {{{userProfile.calorieTarget}}} kcal

DATABASE OF ITEMS:
{{#each scrapedDatabase}}
- ID: {{id}}, Name: {{name}}, Restaurant: {{restaurant}}, Price: {{price}}, Platform: {{platform}}, Kcal: {{calories}}, Health: {{healthScore}}, Tags: {{tags}}
{{/each}}

MODEL LOGIC:
1. PENALTY: Assign -1000 score to any item containing "Exclusion Vector" ingredients.
2. REWARD: Assign +50 to items matching "Filter Constraints".
3. OPTIMIZATION: If BMI is "Overweight/Obese", rank <500kcal items higher. If "Underweight", rank High Protein higher.
4. TARGETING: Prioritize items where Kcal is within 20% of (Target Scalar / 3).

CRITICAL: "reasoning" MUST BE EXTREMELY CONCISE (Target 150 chars). 
- Explain the algorithmic match (e.g., "Matched for high protein-to-calorie ratio").
- ABSOLUTE LIMIT: 200 characters.

Provide the top 3 items with highest calculated scores.`,
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
