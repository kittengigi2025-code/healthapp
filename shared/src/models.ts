// ============================================================
// Core Data Models — AI Calorie Tracking App
// ============================================================

// --- Enums ---

export type Gender = 'male' | 'female' | 'other';

export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';

export type Plan = 'free' | 'pro';

// --- 1. User ---
// Auth info + basic profile collected during onboarding

export interface User {
  id: string; // UUID, links to Supabase Auth
  email: string;
  gender: Gender;
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: Goal;
  target_weight_kg: number | null;
  plan: Plan;
  onboarding_completed: boolean;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

// --- 2. UserProfile ---
// Structured AI profile, enriched over time by AI summaries

export interface UserProfile {
  id: string; // UUID
  user_id: string; // FK → User.id
  dietary_preferences: string[]; // e.g. ["no beef", "loves spicy food"]
  allergens: string[]; // e.g. ["peanuts", "shellfish"]
  common_foods: string[]; // e.g. ["chicken rice", "laksa"]
  eating_patterns: string[]; // e.g. ["usually orders Grab for lunch", "skips breakfast"]
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  summary_text: string; // Free-text AI-generated profile summary (≤500 tokens)
  last_updated_at: string; // ISO datetime
  created_at: string; // ISO datetime
}

// --- 3. MealLog ---
// Each photo-based meal record

export interface IdentifiedFood {
  name: string; // e.g. "Hainanese Chicken Rice"
  calories: number; // kcal
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number; // 0-1, AI confidence in identification
}

export interface NutritionBreakdown {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface MealLog {
  id: string; // UUID
  user_id: string; // FK → User.id
  photo_url: string; // Supabase Storage URL
  identified_foods: IdentifiedFood[];
  nutrition: NutritionBreakdown;
  ai_feedback: string; // AI-generated feedback text
  confirmed_at: string | null; // When user confirmed/edited the results
  created_at: string; // ISO datetime
}

// --- 4. ExerciseLog ---
// Manual exercise record

export type ExerciseType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'gym'
  | 'yoga'
  | 'hiit'
  | 'sports'
  | 'other';

export interface ExerciseLog {
  id: string; // UUID
  user_id: string; // FK → User.id
  exercise_type: ExerciseType;
  exercise_name: string | null; // Custom name if exercise_type is 'other'
  duration_minutes: number;
  estimated_calories_burned: number;
  created_at: string; // ISO datetime
}

// --- 5. DailySummary ---
// Aggregated daily stats + AI summary

export interface DailySummary {
  id: string; // UUID
  user_id: string; // FK → User.id
  date: string; // YYYY-MM-DD
  total_intake_calories: number;
  total_expenditure_calories: number;
  calorie_gap: number; // target - intake + exercise_burned
  daily_target_calories: number; // BMR-adjusted target
  ai_summary: string; // AI-generated day summary
  ai_suggestions: string[]; // Suggestions for tomorrow
  created_at: string; // ISO datetime
}

// --- 6. WeeklyPlan ---
// AI-generated weekly meal + exercise plan

export interface DailyTarget {
  day: string; // e.g. "Monday" or "2026-07-13"
  calorie_target: number;
  focus: string; // e.g. "high protein day"
}

export interface MealSuggestion {
  day: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  suggestion: string; // e.g. "Grilled chicken salad at the hawker center near your office"
  estimated_calories: number;
}

export interface ExerciseSuggestion {
  day: string;
  exercise_type: ExerciseType;
  description: string; // e.g. "30 min brisk walk in the park"
  duration_minutes: number;
  estimated_calories_burned: number;
}

export interface WeeklyPlan {
  id: string; // UUID
  user_id: string; // FK → User.id
  week_start_date: string; // YYYY-MM-DD (Monday)
  daily_targets: DailyTarget[];
  meal_suggestions: MealSuggestion[];
  exercise_suggestions: ExerciseSuggestion[];
  generated_at: string; // ISO datetime
}

// --- 7. InteractionHistory ---
// Raw interaction records for AI summary generation

export type InteractionType = 'meal_analysis' | 'exercise_log' | 'plan_generation' | 'summary_generation';

export interface InteractionHistory {
  id: string; // UUID
  user_id: string; // FK → User.id
  interaction_type: InteractionType;
  related_id: string | null; // FK to MealLog.id, ExerciseLog.id, etc.
  input_summary: string; // Brief description of what user did
  ai_response_summary: string; // Brief description of AI's response
  metadata: Record<string, unknown>; // Flexible extra data
  created_at: string; // ISO datetime
}

// --- Weight Entry (supporting type for profile weight trend chart) ---

export interface WeightEntry {
  id: string; // UUID
  user_id: string; // FK → User.id
  weight_kg: number;
  recorded_at: string; // ISO datetime
}
