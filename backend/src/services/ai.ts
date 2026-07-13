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
  imageType: 'jpeg' | 'png' | 'webp'
): Promise<AnalyzeMealResponse> {
  const mimeType = `image/${imageType}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: FOOD_ANALYSIS_SYSTEM_PROMPT,
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
