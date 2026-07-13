import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { estimateExerciseCalories } from '../utils/calories';
import type { ExerciseType } from '@health-app/shared';

const router = Router();

const VALID_TYPES: ExerciseType[] = [
  'walking', 'running', 'cycling', 'swimming',
  'gym', 'yoga', 'hiit', 'sports', 'other',
];

// --- POST /api/log-exercise ---
router.post('/log-exercise', async (req, res) => {
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

    const { exercise_type, exercise_name, duration_minutes } = req.body;

    // Validate
    if (!exercise_type || !VALID_TYPES.includes(exercise_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: `Exercise type must be one of: ${VALID_TYPES.join(', ')}` },
      });
    }
    if (!duration_minutes || duration_minutes < 1 || duration_minutes > 600) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DURATION', message: 'Duration must be between 1 and 600 minutes' },
      });
    }

    // Get user weight for calorie estimation
    const { data: userData } = await supabase
      .from('users')
      .select('weight_kg')
      .eq('id', user.id)
      .single();

    const weightKg = userData?.weight_kg || 70; // default 70kg if not set

    // Estimate calories burned
    const estimatedCalories = estimateExerciseCalories(
      exercise_type,
      Number(duration_minutes),
      weightKg
    );

    // Save exercise log
    const { data: exerciseLog, error } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: user.id,
        exercise_type,
        exercise_name: exercise_name || null,
        duration_minutes: Number(duration_minutes),
        estimated_calories_burned: estimatedCalories,
      })
      .select()
      .single();

    if (error) throw error;

    // Record interaction history
    await supabase.from('interaction_history').insert({
      user_id: user.id,
      interaction_type: 'exercise_log',
      related_id: exerciseLog.id,
      input_summary: `Logged ${exercise_type} for ${duration_minutes} minutes`,
      ai_response_summary: `Estimated ${estimatedCalories} kcal burned`,
      metadata: { exercise_type, duration_minutes, estimated_calories: estimatedCalories },
    });

    return res.json({ success: true, data: exerciseLog });
  } catch (error: any) {
    console.error('[log-exercise] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'EXERCISE_FAILED', message: error.message },
    });
  }
});

// --- GET /api/today-exercises ---
router.get('/today-exercises', async (req, res) => {
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

    const { data: exercises, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: exercises || [] });
  } catch (error: any) {
    console.error('[today-exercises] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'EXERCISES_FAILED', message: error.message },
    });
  }
});

export default router;
