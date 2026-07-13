import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateWeeklyPlan } from '../services/ai';
import { getDailyCalorieTarget } from '../utils/calories';

const router = Router();

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// --- GET /api/weekly-plan ---
router.get('/weekly-plan', async (req, res) => {
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

    const weekStart = (req.query.week as string) || getWeekStart(new Date());

    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!plan) {
      return res.json({ success: true, data: null });
    }

    return res.json({ success: true, data: plan });
  } catch (error: any) {
    // single() throws if no rows found - that's ok, return null
    if (error.code === 'PGRST116') {
      return res.json({ success: true, data: null });
    }
    console.error('[get-weekly-plan] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'PLAN_FAILED', message: error.message },
    });
  }
});

// --- POST /api/generate-weekly-plan ---
router.post('/generate-weekly-plan', async (req, res) => {
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

    const weekStart = getWeekStart(new Date());

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
      userData.gender,
      userData.age,
      userData.height_cm,
      userData.weight_kg,
      userData.goal,
      activityLevel
    );

    // Get recent meals (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMeals } = await supabase
      .from('meal_logs')
      .select('identified_foods, nutrition')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(20);

    const mealsSummary = (recentMeals || [])
      .map((m: any) => m.identified_foods?.map((f: any) => f.name).join(', '))
      .filter(Boolean)
      .join('; ');

    // Get recent exercises
    const { data: recentExercises } = await supabase
      .from('exercise_logs')
      .select('exercise_type, duration_minutes, estimated_calories_burned')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(20);

    const exercisesSummary = (recentExercises || [])
      .map((e: any) => `${e.exercise_type} ${e.duration_minutes}min (${e.estimated_calories_burned}kcal)`)
      .join('; ');

    // AI-learned preferences
    const aiPreferences = profileData?.ai_profile_summary || '';

    // Generate plan via AI
    const planData = await generateWeeklyPlan(
      userData,
      dailyTarget,
      mealsSummary,
      exercisesSummary,
      aiPreferences
    );

    // Save to database (upsert for this week)
    const { data: savedPlan, error } = await supabase
      .from('weekly_plans')
      .upsert({
        user_id: user.id,
        week_start_date: weekStart,
        daily_targets: planData.daily_targets,
        meal_suggestions: planData.meal_suggestions,
        exercise_suggestions: planData.exercise_suggestions,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,week_start_date',
      })
      .select()
      .single();

    if (error) throw error;

    // Record interaction history
    await supabase.from('interaction_history').insert({
      user_id: user.id,
      interaction_type: 'plan_generation',
      related_id: savedPlan.id,
      input_summary: `Generated weekly plan for ${weekStart}`,
      ai_response_summary: `Plan with ${planData.meal_suggestions.length} meal suggestions and ${planData.exercise_suggestions.length} exercises`,
      metadata: { week_start: weekStart, daily_target: dailyTarget },
    });

    return res.json({ success: true, data: savedPlan });
  } catch (error: any) {
    console.error('[generate-weekly-plan] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'PLAN_FAILED', message: error.message },
    });
  }
});

export default router;
