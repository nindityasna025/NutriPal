'use server';

/**
 * @fileOverview AI flow for generating a full day's meal plan based on user metrics.
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
  swapSuggestion: z.string().describe('An alternative meal if the user doesn\'t like this one'),
  ingredients: z.array(z.string()),
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
  prompt: `You are an expert AI Nutritionist. 
Generate a balanced daily meal plan (Breakfast, Lunch, Dinner) for a user with the following targets:

Total Calorie Target: {{{calorieTarget}}} kcal
Macro Distribution Goal: {{{proteinPercent}}}% Protein, {{{carbsPercent}}}% Carbs, {{{fatPercent}}}% Fat.
Diet Type: {{#if dietType}}{{{dietType}}}{{else}}Standard Balanced{{/if}}
Allergies: {{#if allergies}}{{{allergies}}}{{else}}None{{/if}}

Requirements:
1. The sum of calories across all 3 meals must be close to the calorie target.
2. The meals must respect the diet type and allergies.
3. For each meal, provide a "swapSuggestion" which is a healthier or similar alternative.
4. Keep ingredients simple and accessible.`,
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
