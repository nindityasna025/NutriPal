'use server';

/**
 * @fileOverview An AI Expert Nutritionist flow for analyzing meal photos.
 * 
 * - analyzeMeal - Estimates nutritional content (Kcal, macros) from a photo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeMealInputSchema = z.object({
  photoDataUri: z.string().describe("The photo of the meal as a data URI."),
  description: z.string().optional().describe("Optional description of the meal."),
  userGoal: z.enum(["Maintenance", "Weight Loss", "Weight Gain"]).optional().describe("The user's current health goal."),
});
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;

const AnalyzeMealOutputSchema = z.object({
  name: z.string().describe("The identified name of the meal."),
  calories: z.number().describe("Estimated total calories in kcal."),
  macros: z.object({
    protein: z.number().describe("Estimated protein in grams."),
    carbs: z.number().describe("Estimated carbohydrates in grams."),
    fat: z.number().describe("Estimated fat in grams."),
  }),
  healthScore: z.number().min(0).max(100).describe("A score from 0-100 based on nutritional quality."),
  description: z.string().describe("A brief summary of the meal."),
  ingredients: z.array(z.string()).describe("List of main ingredients identified."),
  expertInsight: z.string().max(200).describe("A combined nutritionist insight. STRICTLY MAX 200 characters."),
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export async function analyzeMeal(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  return analyzeMealFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
  input: { schema: AnalyzeMealInputSchema },
  output: { schema: AnalyzeMealOutputSchema },
  prompt: `You are an expert AI Nutritionist. 
Analyze this meal photo and provide a detailed nutritional breakdown. 
Estimate the portion sizes and calculate the kcal, protein, carbs, and fat as accurately as possible.

User's Specific Health Goal: {{#if userGoal}}{{{userGoal}}}{{else}}General Maintenance{{/if}}

For the "expertInsight" field, provide a single, professional, and encouraging summary that combines the key health benefits of this meal AND how it specifically supports the user's goal ({{{userGoal}}}). 

CRITICAL: The "expertInsight" MUST BE EXTREMELY CONCISE. 
- TARGET LENGTH: 120 characters.
- ABSOLUTE LIMIT: 180 characters. 
- DO NOT EXCEED 180 characters or the validation will fail.

If a description is provided, use it to refine your analysis: "{{{description}}}"

Meal Photo: {{media url=photoDataUri}}

Provide the output in the specified JSON format.`,
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
    inputSchema: AnalyzeMealInputSchema,
    outputSchema: AnalyzeMealOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to analyze the meal.");
    return output;
  }
);
