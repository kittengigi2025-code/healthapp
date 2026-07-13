import OpenAI from 'openai';
import type { AnalyzeMealResponse, IdentifiedFood, NutritionBreakdown } from '@health-app/shared';

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
