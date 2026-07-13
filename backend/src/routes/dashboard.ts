import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { getDailyCalorieTarget } from '../utils/calories';
import type { DailyStatsResponse, ApiResponse } from '@health-app/shared';

const router = Router();

// --- GET /api/daily-stats ---
router.get('/daily-stats', async (req: Request, res: Response<ApiResponse<DailyStatsResponse>>) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth' } });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Get user profile for calorie target calculation
    const { data: userData } = await supabase
      .from('users')
      .select('gender, age, height_cm, weight_kg, goal')
      .eq('id', user.id)
      .single();

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('activity_level')
      .eq('user_id', user.id)
      .single();

    let dailyTarget = 2000; // default
    if (userData) {
      dailyTarget = getDailyCalorieTarget(
        userData.gender,
        userData.age,
        userData.height_cm,
        userData.weight_kg,
        userData.goal,
        profileData?.activity_level || 'sedentary'
      );
    }

    // Sum today's meal intake
    const { data: meals } = await supabase
      .from('meal_logs')
      .select('nutrition')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const totalIntake = (meals || []).reduce((sum: number, m: any) => {
      return sum + (m.nutrition?.total_calories || 0);
    }, 0);

    // Sum today's exercise expenditure
    const { data: exercises } = await supabase
      .from('exercise_logs')
      .select('estimated_calories_burned')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const totalExpenditure = (exercises || []).reduce((sum: number, e: any) => {
      return sum + (e.estimated_calories_burned || 0);
    }, 0);

    const calorieGap = dailyTarget - totalIntake + totalExpenditure;

    return res.json({
      success: true,
      data: {
        date,
        total_intake_calories: totalIntake,
        total_expenditure_calories: totalExpenditure,
        daily_target_calories: dailyTarget,
        calorie_gap: calorieGap,
        meals_count: meals?.length || 0,
        exercises_count: exercises?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('[daily-stats] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message: error.message },
    });
  }
});

// --- GET /api/today-meals ---
router.get('/today-meals', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth' } });
    }

    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: meals, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: meals || [] });
  } catch (error: any) {
    console.error('[today-meals] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'MEALS_FAILED', message: error.message },
    });
  }
});

export default router;
