'use server';

/**
 * @fileOverview AI flow for generating a structured recipe for a specific meal.
 * 
 * - generateRecipe - Generates a health-focused recipe with an insight, ingredients, and instructions.
 */

import { executeWithRotation } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRecipeInputSchema = z.object({
  mealName: z.string().describe('The name of the meal to generate a recipe for.'),
  dietaryRestrictions: z.array(z.string()).optional().describe('User dietary restrictions to consider.'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  insight: z.string().max(200).describe('A concise summary of health benefits. STRICTLY MAX 200 chars.'),
  ingredients: z.array(z.string()).describe('List of necessary ingredients.'),
  instructions: z.array(z.string()).describe('Step-by-step cooking instructions.'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return await executeWithRotation(async (aiInstance) => {
    const prompt = aiInstance.definePrompt({
      name: 'generateRecipePrompt',
      input: { schema: GenerateRecipeInputSchema },
      output: { schema: GenerateRecipeOutputSchema },
      prompt: `You are an expert AI Nutritionist and Chef. 
Generate a healthy, delicious, and easy-to-follow recipe for: "{{{mealName}}}".

User's Dietary Context: {{#if dietaryRestrictions}}{{{dietaryRestrictions}}}{{else}}None{{/if}}.

Requirements:
1. The "insight" must combine the health benefits of this meal and explain how it supports the user's current fitness goal. 
2. CRITICAL: The "insight" MUST BE EXTREMELY CONCISE.
   - TARGET LENGTH: 150 characters.
   - ABSOLUTE LIMIT: 200 characters. 
   - Validation will fail if it's longer than 200 characters.
3. The "ingredients" should be a clear list.
4. The "instructions" should be sequential and easy to follow.

Provide the response in the specified structured JSON format.`,
    });

    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to generate recipe.");
    return output;
  });
}
