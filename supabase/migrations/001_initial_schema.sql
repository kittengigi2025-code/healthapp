-- ============================================================
-- Database Schema — AI Calorie Tracking App
-- Migration 001: Initial schema
-- ============================================================

-- 1. Users (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')) NOT NULL,
  age INTEGER NOT NULL,
  height_cm NUMERIC(5,1) NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL,
  goal TEXT CHECK (goal IN ('lose_weight', 'maintain', 'gain_muscle')) NOT NULL,
  target_weight_kg NUMERIC(5,1),
  plan TEXT CHECK (plan IN ('free', 'pro')) NOT NULL DEFAULT 'free',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User Profiles (AI-enriched)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dietary_preferences JSONB NOT NULL DEFAULT '[]',
  allergens JSONB NOT NULL DEFAULT '[]',
  common_foods JSONB NOT NULL DEFAULT '[]',
  eating_patterns JSONB NOT NULL DEFAULT '[]',
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')) NOT NULL DEFAULT 'sedentary',
  summary_text TEXT NOT NULL DEFAULT '',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Meal Logs
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  identified_foods JSONB NOT NULL DEFAULT '[]',
  nutrition JSONB NOT NULL DEFAULT '{}',
  ai_feedback TEXT NOT NULL DEFAULT '',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, created_at DESC);

-- 4. Exercise Logs
CREATE TABLE exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  exercise_name TEXT,
  duration_minutes INTEGER NOT NULL,
  estimated_calories_burned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, created_at DESC);

-- 5. Daily Summaries
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_intake_calories INTEGER NOT NULL DEFAULT 0,
  total_expenditure_calories INTEGER NOT NULL DEFAULT 0,
  calorie_gap INTEGER NOT NULL DEFAULT 0,
  daily_target_calories INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT NOT NULL DEFAULT '',
  ai_suggestions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 6. Weekly Plans
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  daily_targets JSONB NOT NULL DEFAULT '[]',
  meal_suggestions JSONB NOT NULL DEFAULT '[]',
  exercise_suggestions JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- 7. Interaction History (for AI summary generation)
CREATE TABLE interaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('meal_analysis', 'exercise_log', 'plan_generation', 'summary_generation')) NOT NULL,
  related_id UUID,
  input_summary TEXT NOT NULL DEFAULT '',
  ai_response_summary TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interaction_history_user_date ON interaction_history(user_id, created_at DESC);

-- 8. Weight Entries (for trend chart)
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,1) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weight_entries_user_date ON weight_entries(user_id, recorded_at DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profiles" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profiles" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profiles" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own meal logs" ON meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs" ON meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON meal_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own exercise logs" ON exercise_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercise logs" ON exercise_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exercise logs" ON exercise_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own daily summaries" ON daily_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily summaries" ON daily_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own weekly plans" ON weekly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly plans" ON weekly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly plans" ON weekly_plans FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own interaction history" ON interaction_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interaction history" ON interaction_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own weight entries" ON weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight entries" ON weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for food photos
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false);

-- Storage RLS: users can only upload/read their own photos
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can read own photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
