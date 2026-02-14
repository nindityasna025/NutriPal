'use server';

/**
 * @fileOverview AI flow for analyzing a meal based on text description with allergy detection.
 * 
 * - analyzeTextMeal - Estimates nutritional content, identifies ingredients, 
 *   checks for allergens, and generates instructions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeTextMealInputSchema = z.object({
  mealName: z.string().describe("The name or description of the meal."),
  userGoal: z.enum(["Maintenance", "Weight Loss", "Weight Gain"]).optional().describe("The user's current health goal."),
  userAllergies: z.string().optional().describe("The user's known food allergies."),
  userRestrictions: z.array(z.string()).optional().describe("The user's dietary restrictions (e.g., Vegan, Vegetarian)."),
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
  allergenWarning: z.string().optional().describe("Warning message if the meal conflicts with user allergies or restrictions."),
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
User's Goal: {{#if userGoal}}{{{userGoal}}}{{else}}General Maintenance{{/if}}
User's Allergies: {{#if userAllergies}}{{{userAllergies}}}{{else}}None{{/if}}
User's Restrictions: {{#if userRestrictions}}{{{userRestrictions}}}{{else}}None{{/if}}

Requirements:
1. Provide accurate estimates for calories and macros.
2. Identify the main ingredients.
3. Check if any identified ingredients conflict with the user's allergies or dietary restrictions.
4. If a conflict is found, provide a clear and urgent warning in the "allergenWarning" field. If no conflict, leave it empty.
5. Create clear step-by-step "instructions" for the user.
6. The "expertInsight" MUST be encouraging and explain how this meal supports the goal. Max 200 characters.

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
