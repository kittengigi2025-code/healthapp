import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { extractProfileInsights } from '../services/ai';

const router = Router();

// --- POST /api/update-profile-summary ---
// Reads today's InteractionHistory, calls LLM to extract profile insights, merges into UserProfile
router.post('/update-profile-summary', async (req, res) => {
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

    // Get today's interaction history
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: interactions } = await supabase
      .from('interaction_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: true });

    if (!interactions || interactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_INTERACTIONS', message: 'No interactions today to analyze' },
      });
    }

    // Build interaction summary text
    const interactionsText = interactions.map((i: any) =>
      `[${i.interaction_type}] ${i.input_summary} → ${i.ai_response_summary}`
    ).join('\n');

    // Get existing profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const currentProfile = {
      dietary_preferences: existingProfile?.dietary_preferences || [],
      allergens: existingProfile?.allergens || [],
      common_foods: existingProfile?.common_foods || [],
      eating_patterns: existingProfile?.eating_patterns || [],
      activity_level: existingProfile?.activity_level || 'sedentary',
      summary_text: existingProfile?.summary_text || '',
    };

    // Extract insights via AI
    const insights = await extractProfileInsights(interactionsText, currentProfile);

    // Merge: deduplicate arrays (max 20 items each)
    const mergeArrays = (existing: string[], newItems: string[], max: number = 20) => {
      const combined = [...new Set([...existing, ...newItems])];
      return combined.slice(0, max);
    };

    const updatedProfile = {
      dietary_preferences: mergeArrays(currentProfile.dietary_preferences, insights.dietary_preferences),
      allergens: mergeArrays(currentProfile.allergens, insights.allergens),
      common_foods: mergeArrays(currentProfile.common_foods, insights.common_foods),
      eating_patterns: mergeArrays(currentProfile.eating_patterns, insights.eating_patterns),
      activity_level: insights.activity_level || currentProfile.activity_level,
      summary_text: insights.summary_update
        ? (currentProfile.summary_text
            ? currentProfile.summary_text + ' ' + insights.summary_update
            : insights.summary_update)
        : currentProfile.summary_text,
      last_updated_at: new Date().toISOString(),
    };

    // Enforce token budget: summary_text ≤ ~500 tokens (~2000 chars)
    if (updatedProfile.summary_text.length > 2000) {
      updatedProfile.summary_text = updatedProfile.summary_text.slice(-2000);
    }

    // Upsert profile
    if (existingProfile) {
      const { error } = await supabase
        .from('user_profiles')
        .update(updatedProfile)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          ...updatedProfile,
        });

      if (error) throw error;
    }

    return res.json({
      success: true,
      data: {
        updated_fields: {
          dietary_preferences: insights.dietary_preferences,
          allergens: insights.allergens,
          common_foods: insights.common_foods,
          eating_patterns: insights.eating_patterns,
          summary_update: insights.summary_update,
        },
        profile: updatedProfile,
      },
    });
  } catch (error: any) {
    console.error('[update-profile-summary] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'PROFILE_UPDATE_FAILED', message: error.message },
    });
  }
});

export default router;
