import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function analyzeMeal(imageBase64: string, imageType: 'jpeg' | 'png' | 'webp') {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/analyze-meal`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_base64: imageBase64, image_type: imageType }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Analysis failed');
  }
  return json.data;
}

export async function uploadImage(imageBase64: string, imageType: 'jpeg' | 'png' | 'webp') {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/upload-image`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_base64: imageBase64, image_type: imageType }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Upload failed');
  }
  return json.data.photo_url as string;
}

export async function saveMeal(data: {
  photo_url: string;
  identified_foods: any[];
  nutrition: any;
  ai_feedback: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/save-meal`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Save failed');
  }
  return json.data;
}

// --- Dashboard ---

export async function getDailyStats(date?: string) {
  const headers = await getAuthHeaders();
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_URL}/api/daily-stats${params}`, { headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to load stats');
  return json.data;
}

export async function getTodayMeals(date?: string) {
  const headers = await getAuthHeaders();
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_URL}/api/today-meals${params}`, { headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to load meals');
  return json.data as any[];
}

// --- Profile ---

export async function getUserProfile() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/user-profile`, { headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to load profile');
  return json.data;
}

export async function updateUserProfile(data: {
  gender?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  target_weight_kg?: number | null;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/user-profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to update profile');
  return json.data;
}

export async function getWeightHistory() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/weight-history`, { headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to load weight history');
  return json.data as any[];
}

// --- Exercise ---

export async function logExercise(data: {
  exercise_type: string;
  exercise_name?: string;
  duration_minutes: number;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/log-exercise`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to log exercise');
  return json.data;
}

export async function getTodayExercises(date?: string) {
  const headers = await getAuthHeaders();
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_URL}/api/today-exercises${params}`, { headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to load exercises');
  return json.data as any[];
}
