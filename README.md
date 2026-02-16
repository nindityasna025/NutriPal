# NutriPal - Your AI-Powered Nutrition Partner

Welcome to NutriPal, a sophisticated, AI-driven web application designed to be your personal nutrition and meal-planning assistant. Built with a production-ready, secure, and scalable architecture, NutriPal helps you take control of your health with ease and precision.

## The User Journey: A Step-by-Step Flow

This guide walks you through the entire NutriPal experience, from initial setup to daily use.

### 1. Getting Started: Secure Login & Onboarding
- **Secure Demo Login**: The journey begins at a secure login screen. For this demo, a one-click sign-in provides access, simulating a Google login process and automatically connecting you to the app's ecosystem (mock delivery and fitness apps).
- **Personalized Onboarding**: First-time users are guided through a seamless onboarding process. You'll input key biometric data:
    - Gender, Age, Weight, and Height.
    - The app instantly calculates your **BMI** and identifies your **BMI category** (e.g., Ideal, Overweight).
    - You can set **Health Markers** like dietary restrictions (Vegetarian, Gluten-free) and list any known **food allergies**.
- This initial setup is crucial as it personalizes your entire experience, from calorie targets to AI-generated recommendations.

### 2. The Dashboard (Today): Your Daily Command Center
The main dashboard provides a comprehensive, at-a-glance overview of your daily nutritional journey.
- **Energy Balance & Macro Tracking**: Visualize your daily calorie consumption against your target. A dynamic progress bar breaks down your intake into protein, carbs, and fat.
- **Hydration & Active Burn**: Easily log your water intake. The "Active Burn" monitor shows calories burned, and when you have a highly active day, the flame icon turns red, giving you access to an AI-generated recovery meal plan for the next day.
- **Weekly Macro Trends**: A chart visualizes your calorie intake (by macro) and calories burned over the last seven days, helping you spot trends.
- **Daily Food Record**: A detailed log of all your consumed and planned meals for the day. You can expand each meal to see expert AI insights, ingredients, and health scores.

### 3. Planning Your Meals (Plan)
Your central hub for organizing your meals.
- **Daily Scheduling**: Navigate through days to plan your meals in advance.
- **Add Custom Meals**: Add a meal manually with specific nutritional info, or let the AI analyze the meal name and ingredients to automatically calculate all nutritional data, including a health score and cooking instructions.
- **View Recipes**: For any meal in your schedule, you can view the full recipe, including ingredients and step-by-step instructions.

### 4. Effortless Logging with AI (Snap)
A powerful computer vision tool to log your food effortlessly.
- **Live Camera & Gallery Upload**: Record a meal by taking a photo or uploading an image.
- **AI Nutritional Breakdown**: The AI analyzes the image to identify the meal and provide a complete nutritional breakdown, including calories, macros, a health score, ingredients, an "Expert Insight," and an allergen warning.
- **Update Existing Meals**: You can use the Snap feature to update a planned meal with a photo, automatically logging its consumption and updating its nutritional data with the AI's analysis.

### 5. Discovering New Options (Explore Hub)
Discover new meal options and generate complete meal plans with powerful AI tools.
- **ML Curation (Delivery Hub)**: Get personalized meal recommendations from popular food delivery services. The AI acts as a scoring engine, ranking options based on your health profile and calorie targets.
- **Recipe From Pantry**: List the ingredients you have, and the AI will generate creative meal ideas and full recipes. You can then schedule these meals for any date and time.
- **Predictive Path (AI Meal Plan)**: Let the AI generate a complete, balanced meal plan (breakfast, lunch, dinner) for any day, tailored to your calorie and macro targets. Each meal comes with a full recipe and a "swap suggestion" for variety.

### 6. Managing Your Profile & Fitness
- **User Profile**: A central place to view and edit your biometric data, dietary restrictions, and allergies. Changes here will immediately update your AI recommendations and calorie targets.
- **Fitness Sync**: This page simulates syncing with wearables like an Apple Watch. It provides a visual overview of connected devices and your weekly activity trends. The data here directly influences the "Active Burn" value on your dashboard.

### 7. Secure Logout
- From the profile page, you can securely sign out of your account. This will return you to the login screen.

## Tech Stack & Architecture

- **Frontend**: Next.js, React, Tailwind CSS, and ShadCN UI for a responsive, modern, and component-based interface.
- **Backend & Database**: Firebase, utilizing Firestore for a secure, real-time database and Firebase Authentication for user management.
- **AI Integration**: Google's Genkit framework powers all generative AI features, with a key rotation system in place for reliability and to manage API rate limits.
- **Deployment**: Hosted on Firebase with a CI/CD pipeline for automated, reliable deployments.
- **Security**: The application is built with security in mind, featuring Firestore Security Rules to protect user data and a global error handling system for permission issues.
