'use server';

/**
 * @fileOverview AI flow for generating a detailed recipe for a specific meal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRecipeInputSchema = z.object({
  mealName: z.string().describe('The name of the meal to generate a recipe for.'),
  dietaryRestrictions: z.array(z.string()).optional().describe('User dietary restrictions to consider.'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  recipe: z.string().describe('A detailed, step-by-step recipe including ingredients and instructions.'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return generateRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: { schema: GenerateRecipeInputSchema },
  output: { schema: GenerateRecipeOutputSchema },
  prompt: `You are an expert nutritionist and chef. 
Please generate a healthy, delicious, and easy-to-follow recipe for: "{{{mealName}}}".

Consider these dietary restrictions: {{#if dietaryRestrictions}}{{{dietaryRestrictions}}}{{else}}None{{/if}}.

Please structure the response clearly with these EXACT section headers in bold:
1. **🌟 AI INSIGHT** (Maximum 400 characters summary of health benefits and how this aligns with a healthy lifestyle)
2. **🛒 INGREDIENTS** (Use bullet points)
3. **👨‍🍳 INSTRUCTIONS** (Use numbered steps)

Keep the tone professional yet encouraging. Avoid long paragraphs; use clear spacing between sections.
CRITICAL: The AI INSIGHT section MUST NOT exceed 400 characters.`,
});

const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
