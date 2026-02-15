'use server';

/**
 * @fileOverview Predictive Menu Synthesis Model with Key Rotation.
 */

import { executeWithRotation } from '@/ai/genkit';
import { z } from 'genkit';

const MacroSchema = z.object({
  protein: z.number().describe('Protein in grams'),
  carbs: z.number().describe('Carbohydrates in grams'),
  fat: z.number().describe('Fat in grams'),
});

// Defines a complete meal with recipe details.
const SingleMealSchema = z.object({
  name: z.string(),
  calories: z.number(),
  macros: MacroSchema,
  description: z.string(),
  ingredients: z.array(z.string()).describe("A list of all necessary ingredients."),
  instructions: z.array(z.string()).describe("Step-by-step cooking instructions."),
});

// Extends a single meal to include a time and a swap suggestion.
const MealRecommendationSchema = SingleMealSchema.extend({
  time: z.string().describe('HH:mm AM/PM format'),
  swapSuggestion: SingleMealSchema.extend({ time: z.string().optional() }),
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

/**
 * Generates a meal plan.
 * Caching has been temporarily disabled to resolve a server-side error.
 */
export async function generateDailyPlan(input: GenerateDailyPlanInput): Promise<GenerateDailyPlanOutput> {
  try {
    // Call AI with Key Rotation
    return await executeWithRotation(async (aiInstance) => {
      const prompt = aiInstance.definePrompt({
        name: 'generateDailyPlanPrompt',
        input: { schema: GenerateDailyPlanInputSchema },
        output: { schema: GenerateDailyPlanOutputSchema },
        prompt: `You are NutriPal, an expert nutrition planner.
Return ONLY a valid JSON object that strictly matches the output schema. Provide no explanations or extra text.

User Profile:
- Target Calories: {{{calorieTarget}}}
- Diet Type: {{{dietType}}}
- Allergies: {{{allergies}}}

Task:
Generate a full day's meal plan (breakfast, lunch, dinner).

For EACH of the three meals, you MUST provide:
1.  **name**: A creative and appealing name for the meal.
2.  **calories**: Estimated calories, rounded to an integer.
3.  **macros**: Estimated protein, carbs, and fat in grams, rounded to integers.
4.  **time**: A suggested time in HH:mm AM/PM format (e.g., "08:00 AM").
5.  **description**: A short, enticing one-sentence description of the meal.
6.  **ingredients**: A complete list of all necessary ingredients for the recipe.
7.  **instructions**: Clear, step-by-step cooking instructions.
8.  **swapSuggestion**: A complete and different alternative meal, including its own name, calories, macros, description, ingredients, and instructions. This must be a full meal, not just a single ingredient swap.`,
      });

      const { output } = await prompt(input);
      if (!output) throw new Error("AI failed to generate daily plan.");
      
      // Caching logic removed.
      
      return output;
    });
  } catch (error: any) {
    console.error("AI Planning Error:", error);
    throw error;
  }
}
