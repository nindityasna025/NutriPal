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
  description: z.string().describe("A brief nutritionist's summary of the meal."),
  ingredients: z.array(z.string()).describe("List of main ingredients identified."),
  healthBenefit: z.string().describe("Specific health benefits of this meal."),
  weightGoalAdvice: z.string().describe("Analysis of how this meal fits Maintenance, Weight Loss, or Weight Gain goals."),
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

Include the following sections in your output:
1. "healthBenefit": A clear summary of the nutritional strengths of this meal (e.g., high in antioxidants, heart-healthy fats, etc.).
2. "weightGoalAdvice": A breakdown of how this meal performs for someone looking to Maintain Weight, Lose Weight, or Gain Weight.

If a description is provided, use it to refine your analysis: "{{{description}}}"

Meal Photo: {{media url=photoDataUri}}

Provide the output in the specified JSON format. Be encouraging but professional.`,
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
