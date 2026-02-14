'use server';

/**
 * @fileOverview AI flow for analyzing a meal based on text description.
 * 
 * - analyzeTextMeal - Estimates nutritional content (Kcal, macros) from text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeTextMealInputSchema = z.object({
  mealName: z.string().describe("The name or description of the meal."),
  userGoal: z.enum(["Maintenance", "Weight Loss", "Weight Gain"]).optional().describe("The user's current health goal."),
});
export type AnalyzeTextMealInput = z.infer<typeof AnalyzeTextMealInputSchema>;

const AnalyzeTextMealOutputSchema = z.object({
  calories: z.number().describe("Estimated total calories in kcal."),
  macros: z.object({
    protein: z.number().describe("Estimated protein in grams."),
    carbs: z.number().describe("Estimated carbohydrates in grams."),
    fat: z.number().describe("Estimated fat in grams."),
  }),
  healthScore: z.number().min(0).max(100).describe("A score from 0-100 based on nutritional quality."),
  description: z.string().describe("A brief professional description of the meal."),
  expertInsight: z.string().max(200).describe("A combined nutritionist insight covering health benefits and goal alignment. Max 200 characters."),
});
export type AnalyzeTextMealOutput = z.infer<typeof AnalyzeTextMealOutputSchema>;

export async function analyzeTextMeal(input: AnalyzeTextMealInput): Promise<AnalyzeTextMealOutput> {
  return analyzeTextMealFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextMealPrompt',
  input: { schema: AnalyzeTextMealInputSchema },
  output: { schema: AnalyzeTextMealOutputSchema },
  prompt: `You are an expert AI Nutritionist. 
Analyze the following meal description and provide a detailed nutritional breakdown. 
Estimate the portions and calculate the kcal, protein, carbs, and fat as accurately as possible based on standard database values.

Meal: "{{{mealName}}}"
User's Specific Health Goal: {{#if userGoal}}{{{userGoal}}}{{else}}General Maintenance{{/if}}

Requirements:
1. Provide accurate estimates for calories and macros.
2. The "expertInsight" MUST be encouraging and explain how this specific meal supports the goal ({{{userGoal}}}). 
3. CRITICAL: The "expertInsight" MUST NOT EXCEED 200 characters.

Provide the output in the specified JSON format.`,
});

const analyzeTextMealFlow = ai.defineFlow(
  {
    name: 'analyzeTextMealFlow',
    inputSchema: AnalyzeTextMealInputSchema,
    outputSchema: AnalyzeTextMealOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to analyze the meal.");
    return output;
  }
);
