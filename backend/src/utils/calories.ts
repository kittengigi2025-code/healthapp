import type { Gender, Goal } from '@health-app/shared';

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * Most accurate BMR formula for general population
 */
export function calculateBMR(
  gender: Gender,
  age: number,
  height_cm: number,
  weight_kg: number
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'male') {
    return Math.round(base + 5);
  } else {
    // female and other use the female formula
    return Math.round(base - 161);
  }
}

/**
 * Calculate Total Daily Energy Expenditure
 * Uses activity multiplier on top of BMR
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active'
): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  return Math.round(bmr * (multipliers[activityLevel] ?? 1.2));
}

/**
 * Calculate daily calorie target based on TDEE and goal
 */
export function calculateDailyTarget(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose_weight':
      // 500 kcal deficit = ~0.5 kg/week loss
      return Math.round(tdee - 500);
    case 'gain_muscle':
      // 300 kcal surplus for lean bulk
      return Math.round(tdee + 300);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

/**
 * Convenience: calculate daily target from user profile data
 */
export function getDailyCalorieTarget(
  gender: Gender,
  age: number,
  height_cm: number,
  weight_kg: number,
  goal: Goal,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' = 'sedentary'
): number {
  const bmr = calculateBMR(gender, age, height_cm, weight_kg);
  const tdee = calculateTDEE(bmr, activityLevel);
  return calculateDailyTarget(tdee, goal);
}

/**
 * Estimate calories burned from exercise using MET values
 * MET = Metabolic Equivalent of Task
 * Calories = MET * weight_kg * duration_hours
 */
export function estimateExerciseCalories(
  exerciseType: string,
  durationMinutes: number,
  weightKg: number
): number {
  const metValues: Record<string, number> = {
    walking: 3.5,
    running: 8.0,
    cycling: 6.0,
    swimming: 7.0,
    gym: 5.0,
    yoga: 2.5,
    hiit: 9.0,
    sports: 6.5,
    other: 4.0,
  };

  const met = metValues[exerciseType] ?? 4.0;
  const durationHours = durationMinutes / 60;
  return Math.round(met * weightKg * durationHours);
}
