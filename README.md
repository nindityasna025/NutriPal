# NutriPal - Your AI-Powered Nutrition Partner

Welcome to NutriPal, a sophisticated, AI-driven web application designed to be your personal nutrition and meal-planning assistant. Built with a production-ready, secure, and scalable architecture, NutriPal helps you take control of your health with ease and precision.

## Core Features

### 1. Dashboard (Today)
The main dashboard provides a comprehensive, at-a-glance overview of your daily nutritional journey.
- **Energy Balance & Macro Tracking**: Visualize your daily calorie consumption against your target. A dynamic progress bar breaks down your intake into protein, carbs, and fat, helping you understand your macro-nutrient distribution.
- **Hydration Tracker**: Easily log your water intake throughout the day to ensure you stay hydrated.
- **Active Burn Monitor**: Syncs with your fitness data to show calories burned through activity. When you have a highly active day, the app proactively suggests an AI-generated recovery meal plan.
- **Weekly Macro Trends**: A beautiful chart visualizes your calorie intake (broken down by macros) and calories burned over the last seven days, helping you spot trends and stay consistent.
- **Daily Food Record**: A detailed log of all your consumed and planned meals for the day. You can expand each meal to see expert AI insights, ingredients, and health scores.

### 2. Meal Planner (Plan)
Your central hub for organizing your meals.
- **Daily Scheduling**: Navigate through days to plan your meals in advance.
- **Add Custom Meals**: Manually add a meal with specific nutritional information, or let the AI analyze the meal name and ingredients to automatically calculate all nutritional data, including calories, macros, a health score, and even cooking instructions.
- **AI-Powered Analysis**: When adding a meal with just a name (e.g., "Chicken Salad"), the AI estimates its nutritional content, generates a recipe, and provides an expert insight.
- **Smart Alerts**: Set reminders for your scheduled meals.

### 3. Snap Meal Analysis (Snap)
A powerful computer vision tool to log your food effortlessly.
- **Live Camera & Gallery Upload**: Record a meal by taking a live photo with your camera or by uploading an image from your gallery.
- **AI Nutritional Breakdown**: The AI analyzes the image to identify the meal, estimate portion sizes, and provide a complete nutritional breakdown, including:
    - Calories, protein, carbs, and fat.
    - A health score (0-100).
    - A list of identified ingredients.
    - An "Expert Insight" from an AI nutritionist.
    - An allergen warning if the meal conflicts with your profile.
- **Update Existing Meals**: You can use the Snap feature to update a planned meal with a photo, automatically logging its consumption and updating its nutritional data with the AI's analysis.

### 4. Explore Hub
Discover new meal options and generate complete meal plans with powerful AI tools.
- **ML Curation (Delivery Hub)**: Get personalized meal recommendations from popular food delivery services like GrabFood and GoFood. The AI acts as a scoring engine, ranking options based on your health profile, calorie targets, and allergies.
- **Recipe From Pantry**: Don't know what to make? Simply list the ingredients you have on hand, and the AI will generate creative meal ideas, full recipes, and even suggest healthier alternatives.
- **Predictive Path (AI Meal Plan)**: Let the AI generate a complete, balanced meal plan for any day. It creates a breakfast, lunch, and dinner menu tailored to your calorie and macro targets, dietary restrictions, and allergies. Each meal comes with a creative name, full recipe, and even a "swap suggestion" for variety.

### 5. Fitness & Profile Management
- **Fitness Sync**: A dedicated page to simulate syncing with wearables like Apple Watch and health platforms. It provides a visual overview of connected devices and your weekly activity.
- **User Profile**: A central place to manage your biometric data (age, weight, height), which automatically calculates your BMI.
- **Health Markers**: Set your dietary restrictions (e.g., Vegetarian, Gluten-free) and list any food allergies to ensure all AI recommendations are tailored and safe for you.
- **Onboarding**: A seamless, one-time setup process that captures your essential data to personalize the entire app experience from the start.

## Tech Stack & Architecture

- **Frontend**: Next.js, React, Tailwind CSS, and ShadCN UI for a responsive, modern, and component-based interface.
- **Backend & Database**: Firebase, utilizing Firestore for a secure, real-time database and Firebase Authentication for user management.
- **AI Integration**: Google's Genkit framework powers all generative AI features, with a key rotation system in place for reliability and to manage API rate limits.
- **Deployment**: Hosted on Firebase with a CI/CD pipeline for automated, reliable deployments.
- **Security**: The application is built with security in mind, featuring Firestore Security Rules to protect user data and a global error handling system for permission issues.
