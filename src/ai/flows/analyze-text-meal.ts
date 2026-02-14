'use server';

/**
 * @fileOverview AI flow for analyzing a meal based on text description.
 * 
 * - analyzeTextMeal - Estimates nutritional content (Kcal, macros), identifies ingredients, 
 *   and generates cooking instructions from text.
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
  ingredients: z.array(z.string()).describe("List of main ingredients identified in the meal."),
  expertInsight: z.string().max(200).describe("A combined nutritionist insight. STRICTLY MAX 200 characters."),
  instructions: z.array(z.string()).describe("Step-by-step cooking instructions for this meal."),
});
export type AnalyzeTextMealOutput = z.infer<typeof AnalyzeTextMealOutputSchema>;

export async function analyzeTextMeal(input: AnalyzeTextMealInput): Promise<AnalyzeTextMealOutput> {
  return analyzeTextMealFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextMealPrompt',
  input: { schema: AnalyzeTextMealInputSchema },
  output: { schema: AnalyzeTextMealOutputSchema },
  prompt: `You are an expert AI Nutritionist and Chef. 
Analyze the following meal description and provide a full nutritional and culinary breakdown.

Meal: "{{{mealName}}}"
User's Specific Health Goal: {{#if userGoal}}{{{userGoal}}}{{else}}General Maintenance{{/if}}

Requirements:
1. Provide accurate estimates for calories and macros (Protein, Carbs, Fat).
2. Identify the likely main ingredients.
3. Create clear, concise step-by-step "instructions" (Cooking Path) for the user.
4. The "expertInsight" MUST be encouraging and explain how this specific meal supports the goal ({{{userGoal}}}). 
5. CRITICAL: The "expertInsight" MUST BE EXTREMELY CONCISE AND STRICTLY NOT EXCEED 200 characters. 

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
