
'use server';

/**
 * @fileOverview Predictive Menu Synthesis Model for daily planning.
 * - Includes rule-based fallback for 429 quota handling.
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
  swapSuggestion: z.string().describe('An alternative meal'),
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

  const createMeal = (name: string, cals: number, time: string) => ({
    name,
    calories: cals,
    time,
    macros: {
      protein: Math.round((cals * (input.proteinPercent / 100)) / 4),
      carbs: Math.round((cals * (input.carbsPercent / 100)) / 4),
      fat: Math.round((cals * (input.fatPercent / 100)) / 9),
    },
    description: "Synthesized based on biometric rules (AI Fallback active).",
    swapSuggestion: "Alternative healthy source",
    ingredients: ["Fresh ingredients", "Lean protein"],
  });

  return {
    breakfast: createMeal("Oatmeal with Fruits", bCals, "08:00 AM"),
    lunch: createMeal("Grilled Chicken Salad", lCals, "12:30 PM"),
    dinner: createMeal("Steamed Fish with Greens", dCals, "07:00 PM"),
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
- Macros: {{{proteinPercent}}}% P, {{{carbsPercent}}}% C, {{{fatPercent}}}% F
- Diet: {{#if dietType}}{{{dietType}}}{{else}}Standard{{/if}}
- Exclude: {{#if allergies}}{{{allergies}}}{{else}}None{{/if}}

RULES:
1. SUM(Cals) within 5% of Target.
2. "description" MUST BE CONCISE (MAX 150 chars). Target 120 chars.
3. Predict optimal path based on biophysical constraints.

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
