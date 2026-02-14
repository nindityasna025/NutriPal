'use server';

/**
 * @fileOverview Predictive Menu Synthesis Model for daily planning.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MacroSchema = z.object({
  protein: z.number().describe('Protein in grams'),
  carbs: z.number().describe('Carbohydrates in grams'),
  fat: z.number().describe('Fat in grams'),
});

const MealRecommendationSchema = z.object({
  name: z.string(),
  calories: z.number(),
  time: z.string(),
  macros: MacroSchema,
  description: z.string(),
  swapSuggestion: z.string().describe('An alternative meal'),
  ingredients: z.array(z.string()),
  deliveryMatch: z.object({
    isAvailable: z.boolean(),
    platform: z.enum(['GrabFood', 'GoFood']).optional(),
    price: z.string().optional(),
    restaurant: z.string().optional(),
  }).optional(),
});

const GenerateDailyPlanInputSchema = z.object({
  calorieTarget: z.number(),
  proteinPercent: z.number(),
  carbsPercent: z.number(),
  fatPercent: z.number(),
  dietType: z.string().optional(),
  allergies: z.string().optional(),
});
export type GenerateDailyPlanInput = z.infer<typeof GenerateDailyPlanInputSchema>;

const GenerateDailyPlanOutputSchema = z.object({
  breakfast: MealRecommendationSchema,
  lunch: MealRecommendationSchema,
  dinner: MealRecommendationSchema,
});
export type GenerateDailyPlanOutput = z.infer<typeof GenerateDailyPlanOutputSchema>;

export async function generateDailyPlan(input: GenerateDailyPlanInput): Promise<GenerateDailyPlanOutput> {
  return generateDailyPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyPlanPrompt',
  input: { schema: GenerateDailyPlanInputSchema },
  output: { schema: GenerateDailyPlanOutputSchema },
  prompt: `You are the NutriPal Predictive Menu Synthesis Model. 
Your task is to synthesize a 3-meal plan that optimizes for the following biophysical targets:

TARGETS:
- Total Daily Energy: {{{calorieTarget}}} kcal
- Macro Ratios: {{{proteinPercent}}}% P, {{{carbsPercent}}}% C, {{{fatPercent}}}% F
- Diet Constraint: {{#if dietType}}{{{dietType}}}{{else}}Standard{{/if}}
- Exclusion List: {{#if allergies}}{{{allergies}}}{{else}}None{{/if}}

SYNTHESIS RULES:
1. SUM(Calories) must deviate by <5% from Target.
2. Ensure meals are accessible on major delivery platforms (Grab/Gojek).
3. "description" must be CONCISE (MAX 180 chars).
4. Predict 1 "swapSuggestion" for each meal that maintains similar macro profiles.

Synthesize the optimal 24-hour nutritional path.`,
});

const generateDailyPlanFlow = ai.defineFlow(
  {
    name: 'generateDailyPlanFlow',
    inputSchema: GenerateDailyPlanInputSchema,
    outputSchema: GenerateDailyPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to generate daily plan.");
    return output;
  }
);
