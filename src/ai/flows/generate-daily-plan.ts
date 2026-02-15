'use server';

/**
 * @fileOverview Predictive Menu Synthesis Model for daily planning.
 * - Includes rule-based fallback for 429 quota handling.
 * - Generates both primary and swap suggestions for each meal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MacroSchema = z.object({
  protein: z.number().describe('Protein in grams'),
  carbs: z.number().describe('Carbohydrates in grams'),
  fat: z.number().describe('Fat in grams'),
});

const MealRecommendationSchema = z.object({
  name: z.string(),
  calories: z.number(),
  time: z.string(),
  macros: MacroSchema,
  description: z.string(),
  swapSuggestion: z.object({
    name: z.string(),
    calories: z.number(),
    time: z.string().optional().describe('Inherits timing if empty'),
    macros: MacroSchema,
    description: z.string(),
  }).describe('An alternative healthy meal option'),
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

export async function generateDailyPlan(input: GenerateDailyPlanInput): Promise<GenerateDailyPlanOutput> {
  try {
    return await generateDailyPlanFlow(input);
  } catch (error: any) {
    if (error.message?.includes('429')) {
      console.warn('AI Quota Exceeded. Using Rule-Based Fallback for Smart Menu.');
      return ruleBasedMenuFallback(input);
    }
    throw error;
  }
}

function ruleBasedMenuFallback(input: GenerateDailyPlanInput): GenerateDailyPlanOutput {
  const { calorieTarget } = input;
  const bCals = Math.round(calorieTarget * 0.25);
  const lCals = Math.round(calorieTarget * 0.40);
  const dCals = Math.round(calorieTarget * 0.35);

  const calculateMacros = (cals: number) => ({
    protein: Math.round((cals * (input.proteinPercent / 100)) / 4),
    carbs: Math.round((cals * (input.carbsPercent / 100)) / 4),
    fat: Math.round((cals * (input.fatPercent / 100)) / 9),
  });

  const createMeal = (name: string, cals: number, time: string, swapName: string) => ({
    name,
    calories: cals,
    time,
    macros: calculateMacros(cals),
    description: "Synthesized based on biometric rules (AI Fallback active).",
    swapSuggestion: {
      name: swapName,
      calories: cals,
      time,
      macros: calculateMacros(cals),
      description: "Alternative option generated via biometric rules.",
    },
    ingredients: ["Fresh ingredients", "Lean protein"],
  });

  return {
    breakfast: createMeal("Oatmeal with Fruits", bCals, "08:00 AM", "Greek Yogurt with Berries"),
    lunch: createMeal("Grilled Chicken Salad", lCals, "12:30 PM", "Quinoa Veggie Bowl"),
    dinner: createMeal("Steamed Fish with Greens", dCals, "07:00 PM", "Tofu Stir-fry with Broccoli"),
  };
}

const prompt = ai.definePrompt({
  name: 'generateDailyPlanPrompt',
  input: { schema: GenerateDailyPlanInputSchema },
  output: { schema: GenerateDailyPlanOutputSchema },
  prompt: `You are the NutriPal Predictive Menu Synthesis Model. 
Synthesize a 3-meal path for:

TARGETS:
- Energy: {{{calorieTarget}}} kcal
- Macros: {{{proteinPercent}}}% Protein, {{{carbsPercent}}}% Carbs, {{{fatPercent}}}% Fat
- Diet: {{#if dietType}}{{{dietType}}}{{else}}Standard{{/if}}
- Exclude: {{#if allergies}}{{{allergies}}}{{else}}None{{/if}}

RULES:
1. SUM(Calories) within 5% of Target.
2. Provide a "swapSuggestion" for each meal that is also health-aligned.
3. Descriptions MUST BE EXTREMELY CONCISE (MAX 150 chars).

Synthesize now.`,
});

const generateDailyPlanFlow = ai.defineFlow(
  {
    name: 'generateDailyPlanFlow',
    inputSchema: GenerateDailyPlanInputSchema,
    outputSchema: GenerateDailyPlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("AI failed to generate daily plan.");
    return output;
  }
);
