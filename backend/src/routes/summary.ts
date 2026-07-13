import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateDailySummary } from '../services/ai';
import { getDailyCalorieTarget } from '../utils/calories';

const router = Router();

// --- GET /api/daily-summary ---
router.get('/daily-summary', async (req, res) => {
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

    const { data: summary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (!summary) {
      return res.json({ success: true, data: null });
    }

    return res.json({ success: true, data: summary });
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      return res.json({ success: true, data: null });
    }
    console.error('[get-daily-summary] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SUMMARY_FAILED', message: error.message },
    });
  }
});

// --- POST /api/generate-daily-summary ---
router.post('/generate-daily-summary', async (req, res) => {
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

    const date = (req.body.date as string) || new Date().toISOString().split('T')[0];
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Get user profile
    const { data: userData } = await supabase
      .from('users')
      .select('gender, age, height_cm, weight_kg, goal')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_PROFILE', message: 'Complete onboarding first' },
      });
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const activityLevel = (profileData?.activity_level as any) || 'sedentary';
    const dailyTarget = getDailyCalorieTarget(
      userData.gender, userData.age, userData.height_cm, userData.weight_kg,
      userData.goal, activityLevel
    );

    // Get today's meals
    const { data: meals } = await supabase
      .from('meal_logs')
      .select('identified_foods, nutrition')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (!meals || meals.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_MEALS', message: 'Log at least one meal before generating a summary' },
      });
    }

    const totalIntake = meals.reduce((sum: number, m: any) => {
      return sum + (m.nutrition?.total_calories || 0);
    }, 0);

    const mealsSummary = meals
      .map((m: any) => m.identified_foods?.map((f: any) => f.name).join(', '))
      .filter(Boolean)
      .join('; ');

    // Get today's exercises
    const { data: exercises } = await supabase
      .from('exercise_logs')
      .select('exercise_type, duration_minutes, estimated_calories_burned')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const totalExpenditure = (exercises || []).reduce((sum: number, e: any) => {
      return sum + (e.estimated_calories_burned || 0);
    }, 0);

    const exercisesSummary = (exercises || [])
      .map((e: any) => `${e.exercise_type} ${e.duration_minutes}min (${e.estimated_calories_burned}kcal)`)
      .join('; ');

    const aiPreferences = profileData?.summary_text || '';

    // Generate summary via AI
    const summaryData = await generateDailySummary(
      userData,
      dailyTarget,
      totalIntake,
      totalExpenditure,
      mealsSummary,
      exercisesSummary,
      aiPreferences
    );

    // Save/upsert to database
    const calorieGap = dailyTarget - totalIntake + totalExpenditure;

    const { data: savedSummary, error } = await supabase
      .from('daily_summaries')
      .upsert({
        user_id: user.id,
        date,
        total_intake_calories: totalIntake,
        total_expenditure_calories: totalExpenditure,
        calorie_gap: calorieGap,
        daily_target_calories: dailyTarget,
        ai_summary: summaryData.ai_summary,
        ai_suggestions: summaryData.ai_suggestions,
      }, {
        onConflict: 'user_id,date',
      })
      .select()
      .single();

    if (error) throw error;

    // Record interaction history
    await supabase.from('interaction_history').insert({
      user_id: user.id,
      interaction_type: 'summary_generation',
      related_id: savedSummary.id,
      input_summary: `Generated daily summary for ${date}`,
      ai_response_summary: summaryData.ai_summary.slice(0, 200),
      metadata: { date, total_intake: totalIntake, suggestions_count: summaryData.ai_suggestions.length },
    });

    return res.json({ success: true, data: savedSummary });
  } catch (error: any) {
    console.error('[generate-daily-summary] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SUMMARY_FAILED', message: error.message },
    });
  }
});

export default router;
