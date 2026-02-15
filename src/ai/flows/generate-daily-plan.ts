'use server';

/**
 * @fileOverview Predictive Menu Synthesis Model with Key Rotation.
 */

import { executeWithRotation } from '@/ai/genkit';
import { z } from 'genkit';
// Firebase imports removed to fix server-side execution error. Caching is temporarily disabled.

const MacroSchema = z.object({
  protein: z.number().describe('Protein in grams'),
  carbs: z.number().describe('Carbohydrates in grams'),
  fat: z.number().describe('Fat in grams'),
});

const MealRecommendationSchema = z.object({
  name: z.string(),
  calories: z.number(),
  time: z.string().describe('HH:mm AM/PM format'),
  macros: MacroSchema,
  description: z.string(),
  swapSuggestion: z.object({
    name: z.string(),
    calories: z.number(),
    time: z.string().optional(),
    macros: MacroSchema,
    description: z.string(),
  }),
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
        prompt: `You are NutriPal, a nutrition planner.
Return ONLY valid JSON. No explanations. Keep concise.

User:
Calories: {{{calorieTarget}}}
Diet: {{{dietType}}}
Allergy: {{{allergies}}}

Generate breakfast, lunch, and dinner.
Include calories, protein, carbs, and fat per meal.
Round numbers to integers.`,
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
