// src/ai/flows/curate-meal-suggestions.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for curating meal suggestions based on user preferences, location, and available deals from Shopee, Grabfood, and Gojek.
 *
 * - curateMealSuggestions - A function that curates meal suggestions for the user.
 * - CurateMealSuggestionsInput - The input type for the curateMealSuggestions function.
 * - CurateMealSuggestionsOutput - The output type for the curateMealSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CurateMealSuggestionsInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe(
      'The dietary preferences of the user (e.g., vegetarian, gluten-free, vegan).'
    ),
  location: z
    .string()
    .describe('The current location of the user (e.g., city, address).'),
  availableDeals: z
    .string()
    .describe(
      'A list of available deals from Shopee, Grabfood, and Gojek, including the price and vendor.'
    ),
});
export type CurateMealSuggestionsInput = z.infer<
  typeof CurateMealSuggestionsInputSchema
>;

const CurateMealSuggestionsOutputSchema = z.object({
  mealSuggestions: z
    .string()
    .describe(
      'A list of curated meal suggestions based on the user preferences, location, and available deals.'
    ),
});
export type CurateMealSuggestionsOutput = z.infer<
  typeof CurateMealSuggestionsOutputSchema
>;

export async function curateMealSuggestions(
  input: CurateMealSuggestionsInput
): Promise<CurateMealSuggestionsOutput> {
  return curateMealSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'curateMealSuggestionsPrompt',
  input: {schema: CurateMealSuggestionsInputSchema},
  output: {schema: CurateMealSuggestionsOutputSchema},
  prompt: `You are a personal meal assistant. Please provide a list of meal suggestions based on the user's dietary preferences, location, and available deals from Shopee, Grabfood, and Gojek.

Dietary Preferences: {{{dietaryPreferences}}}
Location: {{{location}}}
Available Deals: {{{availableDeals}}}

Consider the user's preferences and location to suggest healthy and affordable meal options from nearby restaurants and delivery services. Take into account all available deals and provide the cheapest options.

Meal Suggestions:`,
});

const curateMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'curateMealSuggestionsFlow',
    inputSchema: CurateMealSuggestionsInputSchema,
    outputSchema: CurateMealSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
