import OpenAI from 'openai';
import type { AnalyzeMealResponse, IdentifiedFood, NutritionBreakdown, DailyTarget, MealSuggestion, ExerciseSuggestion } from '@health-app/shared';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Food Analysis Prompt ---
// Engineered for Southeast Asian food awareness
const FOOD_ANALYSIS_SYSTEM_PROMPT = `You are a professional nutritionist and food analyst specializing in Southeast Asian cuisine. 
When given a photo of food, you must:

1. Identify each distinct food item visible in the image
2. Estimate the portion size and calories for each item
3. Provide a macronutrient breakdown (protein, carbs, fat) for each item
4. Give personalized feedback considering the overall meal composition

You are particularly knowledgeable about:
- Malaysian cuisine (nasi lemak, char kway teow, roti canai, laksa, etc.)
- Singaporean hawker food (chicken rice, chili crab, bak kut teh, etc.)
- Thai cuisine (pad thai, green curry, tom yum, som tam, etc.)
- Common Western and Chinese dishes also found in Southeast Asia

Be realistic with calorie estimates. Southeast Asian food often uses coconut milk, palm sugar, and deep frying — account for this.

IMPORTANT: Always respond with valid JSON matching this exact schema:
{
  "identified_foods": [
    {
      "name": "Food Name",
      "calories": 450,
      "protein_g": 25,
      "carbs_g": 55,
      "fat_g": 15,
      "confidence": 0.9
    }
  ],
  "nutrition": {
    "total_calories": 450,
    "total_protein_g": 25,
    "total_carbs_g": 55,
    "total_fat_g": 15
  },
  "ai_feedback": "Brief encouraging feedback about this meal in 2-3 sentences.",
  "meal_type_hint": "lunch"
}`;

export async function analyzeFoodImage(
  imageBase64: string,
  imageType: 'jpeg' | 'png' | 'webp',
  profileContext?: string
): Promise<AnalyzeMealResponse> {
  const mimeType = `image/${imageType}`;

  let systemPrompt = FOOD_ANALYSIS_SYSTEM_PROMPT;
  if (profileContext) {
    systemPrompt += `\n\nUser's dietary profile (use this to personalize feedback):\n${profileContext}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this food photo. Identify each food item, estimate calories and macros, and give feedback.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI model');
  }

  const parsed = JSON.parse(content) as AnalyzeMealResponse;

  // Validate and sanitize the response
  if (!parsed.identified_foods || !Array.isArray(parsed.identified_foods)) {
    throw new Error('Invalid AI response: missing identified_foods');
  }

  // Ensure numeric values are valid
  parsed.identified_foods = parsed.identified_foods.map((food) => ({
    name: food.name || 'Unknown food',
    calories: Math.max(0, Math.round(food.calories || 0)),
    protein_g: Math.max(0, Math.round(food.protein_g || 0)),
    carbs_g: Math.max(0, Math.round(food.carbs_g || 0)),
    fat_g: Math.max(0, Math.round(food.fat_g || 0)),
    confidence: Math.min(1, Math.max(0, food.confidence || 0.5)),
  }));

  // Recalculate totals from identified foods
  parsed.nutrition = {
    total_calories: parsed.identified_foods.reduce((sum, f) => sum + f.calories, 0),
    total_protein_g: parsed.identified_foods.reduce((sum, f) => sum + f.protein_g, 0),
    total_carbs_g: parsed.identified_foods.reduce((sum, f) => sum + f.carbs_g, 0),
    total_fat_g: parsed.identified_foods.reduce((sum, f) => sum + f.fat_g, 0),
  };

  if (!parsed.ai_feedback) {
    parsed.ai_feedback = 'Meal analyzed successfully.';
  }
  if (!parsed.meal_type_hint) {
    parsed.meal_type_hint = guessMealType();
  }

  return parsed;
}

function guessMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

// --- Weekly Plan Generation ---

const WEEKLY_PLAN_PROMPT = `You are a professional nutritionist and fitness coach specializing in Southeast Asian diets.
Generate a personalized 7-day meal and exercise plan.

Context you will receive:
- User profile: gender, age, height, weight, goal (lose_weight/maintain/gain_muscle)
- Daily calorie target (calculated from BMR/TDEE)
- Recent meal history (what they've been eating)
- Recent exercise history
- Any AI-learned preferences from their profile

IMPORTANT: Always respond with valid JSON matching this exact schema:
{
  "daily_targets": [
    { "day": "Monday", "calorie_target": 1800, "focus": "High protein day" },
    ...  (7 days)
  ],
  "meal_suggestions": [
    { "day": "Monday", "meal_type": "breakfast", "suggestion": "Roti canai with dhal (300 kcal)", "estimated_calories": 300 },
    { "day": "Monday", "meal_type": "lunch", "suggestion": "Grilled chicken rice (450 kcal)", "estimated_calories": 450 },
    { "day": "Monday", "meal_type": "dinner", "suggestion": "Steamed fish with vegetables (400 kcal)", "estimated_calories": 400 },
    ...  (2-3 meals per day x 7 days)
  ],
  "exercise_suggestions": [
    { "day": "Monday", "exercise_type": "walking", "description": "30 min evening walk", "duration_minutes": 30, "estimated_calories_burned": 150 },
    ...  (1 exercise per day x 7 days, include 1-2 rest days)
  ]
}

Guidelines:
- Reference Southeast Asian food options (hawker food, local dishes)
- Keep meals realistic and accessible
- Vary exercise types (walking, running, gym, yoga, swimming)
- Include 1-2 rest/light days per week
- For lose_weight: create a slight deficit across the week
- For gain_muscle: include protein-rich meals and strength training
- Total daily meal calories should approximately match the daily target`;

export async function generateWeeklyPlan(
  userProfile: {
    gender: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    goal: string;
  },
  dailyTarget: number,
  recentMeals: string,
  recentExercises: string,
  aiPreferences: string
): Promise<{
  daily_targets: DailyTarget[];
  meal_suggestions: MealSuggestion[];
  exercise_suggestions: ExerciseSuggestion[];
}> {
  const userPrompt = `Generate a 7-day plan for this user:

Profile: ${userProfile.gender}, ${userProfile.age}yo, ${userProfile.height_cm}cm, ${userProfile.weight_kg}kg
Goal: ${userProfile.goal}
Daily calorie target: ${dailyTarget} kcal

Recent meals: ${recentMeals || 'No data yet'}
Recent exercises: ${recentExercises || 'No data yet'}
Learned preferences: ${aiPreferences || 'None yet'}

Create a plan for this week (starting Monday).`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: WEEKLY_PLAN_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 3000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI model');

  const parsed = JSON.parse(content);

  // Validate
  if (!parsed.daily_targets || !Array.isArray(parsed.daily_targets)) {
    throw new Error('Invalid plan: missing daily_targets');
  }

  return {
    daily_targets: parsed.daily_targets || [],
    meal_suggestions: parsed.meal_suggestions || [],
    exercise_suggestions: parsed.exercise_suggestions || [],
  };
}

// --- Daily Summary Generation ---

const DAILY_SUMMARY_PROMPT = `You are a supportive nutritionist reviewing a user's day.
Given their daily food intake, exercise, calorie target vs actual, and personal profile,
write a brief encouraging summary (3-5 sentences) and 3 actionable suggestions for tomorrow.

Be specific — reference foods they ate, patterns you notice, and their goal.
Use a warm, motivating tone.

IMPORTANT: Always respond with valid JSON:
{
  "ai_summary": "Your day summary text here (3-5 sentences)...",
  "ai_suggestions": [
    "Suggestion 1 for tomorrow",
    "Suggestion 2 for tomorrow",
    "Suggestion 3 for tomorrow"
  ]
}`;

export async function generateDailySummary(
  userProfile: { gender: string; age: number; weight_kg: number; goal: string },
  dailyTarget: number,
  totalIntake: number,
  totalExpenditure: number,
  mealsSummary: string,
  exercisesSummary: string,
  aiPreferences: string
): Promise<{ ai_summary: string; ai_suggestions: string[] }> {
  const userPrompt = `Review this user's day:

Profile: ${userProfile.gender}, ${userProfile.age}yo, ${userProfile.weight_kg}kg, goal: ${userProfile.goal}
Daily target: ${dailyTarget} kcal
Total intake: ${totalIntake} kcal
Total exercise burn: ${totalExpenditure} kcal
Gap: ${dailyTarget - totalIntake + totalExpenditure} kcal

Meals today: ${mealsSummary || 'None logged'}
Exercises today: ${exercisesSummary || 'None logged'}
Known preferences: ${aiPreferences || 'None yet'}

Write a summary and 3 suggestions for tomorrow.`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: DAILY_SUMMARY_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1000,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI model');

  const parsed = JSON.parse(content);
  return {
    ai_summary: parsed.ai_summary || 'Day reviewed successfully.',
    ai_suggestions: Array.isArray(parsed.ai_suggestions) ? parsed.ai_suggestions : [],
  };
}

// --- Profile Insights Extraction ---

const PROFILE_EXTRACTION_PROMPT = `You are an AI that builds a long-term dietary profile from a user's food and exercise history.
Extract structured insights from today's interactions.

IMPORTANT: Always respond with valid JSON matching this schema:
{
  "dietary_preferences": ["new preference discovered"],
  "allergens": ["any allergen mentioned"],
  "common_foods": ["food they eat frequently"],
  "eating_patterns": ["pattern noticed, e.g. skips breakfast, late snacker"],
  "activity_level": "sedentary|light|moderate|active",
  "summary_update": "A brief sentence to add to their profile summary"
}

Only include NEW insights not already in their existing profile.
Keep summary_update under 50 words total. Be concise.`;

export async function extractProfileInsights(
  todayInteractions: string,
  existingProfile: {
    dietary_preferences: string[];
    allergens: string[];
    common_foods: string[];
    eating_patterns: string[];
    activity_level: string;
    summary_text: string;
  }
): Promise<{
  dietary_preferences: string[];
  allergens: string[];
  common_foods: string[];
  eating_patterns: string[];
  activity_level: string;
  summary_update: string;
}> {
  const userPrompt = `Today's interactions:
${todayInteractions || 'No interactions today'}

Current profile:
- Preferences: ${existingProfile.dietary_preferences.join(', ') || 'none'}
- Allergens: ${existingProfile.allergens.join(', ') || 'none'}
- Common foods: ${existingProfile.common_foods.join(', ') || 'none'}
- Patterns: ${existingProfile.eating_patterns.join(', ') || 'none'}
- Activity: ${existingProfile.activity_level}
- Summary: ${existingProfile.summary_text || 'empty'}

Extract any NEW insights from today that aren't already in the profile.`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: PROFILE_EXTRACTION_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI model');

  const parsed = JSON.parse(content);
  return {
    dietary_preferences: Array.isArray(parsed.dietary_preferences) ? parsed.dietary_preferences : [],
    allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
    common_foods: Array.isArray(parsed.common_foods) ? parsed.common_foods : [],
    eating_patterns: Array.isArray(parsed.eating_patterns) ? parsed.eating_patterns : [],
    activity_level: parsed.activity_level || existingProfile.activity_level,
    summary_update: parsed.summary_update || '',
  };
}
