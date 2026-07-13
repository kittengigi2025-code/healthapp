import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { analyzeFoodImage } from '../services/ai';
import type { AnalyzeMealRequest, ApiResponse, AnalyzeMealResponse } from '@health-app/shared';

const router = Router();

const MAX_DAILY_ANALYSES = 10;

router.post('/analyze-meal', async (req: Request, res: Response<ApiResponse<AnalyzeMealResponse>>) => {
  try {
    // Authenticate user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }

    // Check daily analysis limit
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { count } = await supabase
      .from('meal_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if ((count ?? 0) >= MAX_DAILY_ANALYSES) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: `You've reached the daily limit of ${MAX_DAILY_ANALYSES} meal analyses. Try again tomorrow!`,
        },
      });
    }

    // Validate request body
    const { image_base64, image_type } = req.body as AnalyzeMealRequest;
    if (!image_base64 || !image_type) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing image_base64 or image_type' },
      });
    }

    // Fetch user's AI profile for personalized analysis (#10)
    let profileContext = '';
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('dietary_preferences, common_foods, eating_patterns, summary_text')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const parts: string[] = [];
      if (profileData.dietary_preferences?.length) parts.push(`Preferences: ${profileData.dietary_preferences.join(', ')}`);
      if (profileData.common_foods?.length) parts.push(`Common foods: ${profileData.common_foods.join(', ')}`);
      if (profileData.eating_patterns?.length) parts.push(`Patterns: ${profileData.eating_patterns.join(', ')}`);
      if (profileData.summary_text) parts.push(`Profile: ${profileData.summary_text}`);
      profileContext = parts.join('\n');
    }

    // Call AI to analyze the food image
    const analysisResult = await analyzeFoodImage(image_base64, image_type, profileContext || undefined);

    return res.json({
      success: true,
      data: analysisResult,
    });
  } catch (error: any) {
    console.error('[analyze-meal] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'ANALYSIS_FAILED', message: error.message || 'Failed to analyze meal' },
    });
  }
});

// --- Save meal log (after user confirms/edits) ---
router.post('/save-meal', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization' },
      });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      });
    }

    const { photo_url, identified_foods, nutrition, ai_feedback } = req.body;

    const { data: mealLog, error } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        photo_url,
        identified_foods: identified_foods,
        nutrition: nutrition,
        ai_feedback: ai_feedback || '',
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Record interaction history
    await supabase.from('interaction_history').insert({
      user_id: user.id,
      interaction_type: 'meal_analysis',
      related_id: mealLog.id,
      input_summary: `Analyzed meal: ${identified_foods?.map((f: any) => f.name).join(', ') || 'unknown'}`,
      ai_response_summary: `Total: ${nutrition?.total_calories || 0} kcal. ${ai_feedback || ''}`,
      metadata: { food_count: identified_foods?.length || 0 },
    });

    return res.json({
      success: true,
      data: mealLog,
    });
  } catch (error: any) {
    console.error('[save-meal] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SAVE_FAILED', message: error.message || 'Failed to save meal' },
    });
  }
});

// --- Upload image to Supabase Storage ---
router.post('/upload-image', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization' },
      });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      });
    }

    const { image_base64, image_type } = req.body;
    if (!image_base64 || !image_type) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing image data' },
      });
    }

    // Upload to Supabase Storage: meal-photos/{userId}/{timestamp}.{ext}
    const ext = image_type === 'jpeg' ? 'jpg' : image_type;
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const imageBuffer = Buffer.from(image_base64, 'base64');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(fileName, imageBuffer, {
        contentType: `image/${image_type}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meal-photos')
      .getPublicUrl(fileName);

    return res.json({
      success: true,
      data: { photo_url: publicUrl },
    });
  } catch (error: any) {
    console.error('[upload-image] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_FAILED', message: error.message || 'Failed to upload image' },
    });
  }
});

export default router;
