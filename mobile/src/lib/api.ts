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
