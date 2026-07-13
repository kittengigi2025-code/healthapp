import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// --- GET /api/user-profile ---
router.get('/user-profile', async (req, res) => {
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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return res.json({
      success: true,
      data: { user: userData, profile: profileData },
    });
  } catch (error: any) {
    console.error('[user-profile] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'PROFILE_FAILED', message: error.message },
    });
  }
});

// --- PUT /api/user-profile ---
router.put('/user-profile', async (req, res) => {
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

    const { gender, age, height_cm, weight_kg, goal, target_weight_kg } = req.body;

    const { data: updated, error } = await supabase
      .from('users')
      .update({
        gender,
        age,
        height_cm,
        weight_kg,
        goal,
        target_weight_kg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    // If weight changed, log a weight entry
    if (weight_kg) {
      await supabase.from('weight_entries').insert({
        user_id: user.id,
        weight_kg,
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[update-profile] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
});

// --- GET /api/weight-history ---
router.get('/weight-history', async (req, res) => {
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

    const { data: entries, error } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(90);

    if (error) throw error;

    return res.json({ success: true, data: entries || [] });
  } catch (error: any) {
    console.error('[weight-history] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'WEIGHT_FAILED', message: error.message },
    });
  }
});

export default router;
