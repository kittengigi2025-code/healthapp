// ============================================================
// API Request/Response Contracts
// ============================================================

import type { IdentifiedFood, NutritionBreakdown } from './models';

// --- POST /api/analyze-meal ---

export interface AnalyzeMealRequest {
  image_base64: string; // Base64-encoded image
  image_type: 'jpeg' | 'png' | 'webp';
}

export interface AnalyzeMealResponse {
  identified_foods: IdentifiedFood[];
  nutrition: NutritionBreakdown;
  ai_feedback: string;
  meal_type_hint: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// --- POST /api/generate-daily-summary ---

export interface GenerateDailySummaryRequest {
  date: string; // YYYY-MM-DD (optional, defaults to today)
}

export interface GenerateDailySummaryResponse {
  date: string;
  total_intake_calories: number;
  total_expenditure_calories: number;
  calorie_gap: number;
  daily_target_calories: number;
  ai_summary: string;
  ai_suggestions: string[];
}

// --- POST /api/generate-weekly-plan ---

export interface GenerateWeeklyPlanRequest {
  week_start_date: string; // YYYY-MM-DD (Monday)
}

export interface GenerateWeeklyPlanResponse {
  week_start_date: string;
  daily_targets: { day: string; calorie_target: number; focus: string }[];
  meal_suggestions: {
    day: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    suggestion: string;
    estimated_calories: number;
  }[];
  exercise_suggestions: {
    day: string;
    exercise_type: string;
    description: string;
    duration_minutes: number;
    estimated_calories_burned: number;
  }[];
}

// --- POST /api/log-exercise ---

export interface LogExerciseRequest {
  exercise_type: string;
  exercise_name?: string; // For 'other' type
  duration_minutes: number;
}

export interface LogExerciseResponse {
  id: string;
  exercise_type: string;
  duration_minutes: number;
  estimated_calories_burned: number;
}

// --- POST /api/update-profile-summary ---

export interface UpdateProfileSummaryResponse {
  summary_text: string;
  updated_fields: string[];
}

// --- GET /api/daily-stats ---

export interface DailyStatsResponse {
  date: string;
  total_intake_calories: number;
  total_expenditure_calories: number;
  daily_target_calories: number;
  calorie_gap: number;
  meals_count: number;
  exercises_count: number;
}

// --- Standard API envelope ---

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
