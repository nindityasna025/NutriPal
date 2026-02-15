'use server';

/**
 * @fileOverview A personalized diet plan AI agent.
 *
 * - personalizedDietPlans - A function that handles the personalized diet plans process.
 * - PersonalizedDietPlansInput - The input type for the personalizedDietPlans function.
 * - PersonalizedDietPlansOutput - The return type for the personalizedDietPlans function.
 */

import { executeWithRotation } from '@/ai/genkit';
import { z } from 'genkit';

const PersonalizedDietPlansInputSchema = z.object({
  dietaryNeeds: z
    .string()
    .describe(
      'The specific dietary needs of the user (e.g., vegetarian, gluten-free, vegan, etc.).'
    ),
  availableIngredients: z
    .string()
    .describe(
      'A list of ingredients that the user has available to them.  Separate each ingredient with a comma.'
    ),
});
export type PersonalizedDietPlansInput = z.infer<
  typeof PersonalizedDietPlansInputSchema
>;

const PersonalizedDietPlansOutputSchema = z.object({
  mealRecommendations: z
    .array(z.string())
    .describe(
      'A list of personalized meal recommendations based on the user provided dietary needs and available ingredients.'
    ),
  recipes: z
    .array(z.string())
    .describe(
      'Simple recipes for the recommended meals, including ingredients and instructions.'
    ),
  healthierAlternatives: z
    .array(z.string())
    .describe(
      'Suggestions for healthier alternatives to the recommended meals, focusing on organic products and readily available substitutes.'
    ),
});
export type PersonalizedDietPlansOutput = z.infer<
  typeof PersonalizedDietPlansOutputSchema
>;

export async function personalizedDietPlans(
  input: PersonalizedDietPlansInput
): Promise<PersonalizedDietPlansOutput> {
  return await executeWithRotation(async (aiInstance) => {
    const prompt = aiInstance.definePrompt({
      name: 'personalizedDietPlansPrompt',
      input: { schema: PersonalizedDietPlansInputSchema },
      output: { schema: PersonalizedDietPlansOutputSchema },
      prompt: `You are a personal nutrition assistant.  A user will provide you with their dietary restrictions, as well as ingredients they have available to them.

You will provide personalized meal recommendations based on their dietary needs and available ingredients.

You will also provide simple recipes for the recommended meals, including ingredients and instructions.

Finally, you will suggest healthier alternatives to the recommended meals, focusing on organic products and readily available substitutes.

Dietary Needs: {{{dietaryNeeds}}}
Available Ingredients: {{{availableIngredients}}}`,
    });

    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to generate personalized diet plan.");
    return output;
  });
}
