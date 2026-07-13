import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserProfile, updateUserProfile, getWeightHistory, updateProfileSummary } from '../lib/api';
import { supabase } from '../lib/supabase';

type Gender = 'male' | 'female' | 'other';
type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';

const GOAL_OPTIONS: { value: Goal; label: string; emoji: string }[] = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '🔥' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️' },
  { value: 'gain_muscle', label: 'Build Muscle', emoji: '💪' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [aiProfile, setAiProfile] = useState<any>(null);
  const [updatingAi, setUpdatingAi] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [profileData, weights] = await Promise.all([
        getUserProfile(),
        getWeightHistory(),
      ]);
      if (profileData?.user) {
        const u = profileData.user;
        setGender(u.gender || 'male');
        setAge(String(u.age || ''));
        setHeight(String(u.height_cm || ''));
        setWeight(String(u.weight_kg || ''));
        setTargetWeight(String(u.target_weight_kg || ''));
        setGoal(u.goal || 'maintain');
      }
      setWeightHistory(weights || []);
      setAiProfile(profileData?.profile || null);
    } catch (err: any) {
      console.error('Failed to load profile:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({
        gender,
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
      // Reload to get fresh weight history
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateAiProfile() {
    setUpdatingAi(true);
    try {
      const result = await updateProfileSummary();
      Alert.alert('Updated', 'AI profile updated with latest insights.');
      loadProfile(); // reload to get fresh data
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdatingAi(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const recentWeights = weightHistory.slice(0, 7);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, gender === opt.value && styles.chipActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.chipText, gender === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} placeholder="25" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} placeholder="170" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Current Weight (kg)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="70" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Target Weight (kg)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} placeholder="65" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Goal</Text>
          <View style={styles.row}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, goal === opt.value && styles.chipActive]}
                onPress={() => setGoal(opt.value)}
              >
                <Text style={[styles.chipText, goal === opt.value && styles.chipTextActive]}>
                  {opt.emoji} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        {recentWeights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weight Trend</Text>
            {recentWeights.map((entry: any, idx: number) => (
              <View key={entry.id || idx} style={styles.weightRow}>
                <Text style={styles.weightDate}>
                  {new Date(entry.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.weightValue}>{entry.weight_kg} kg</Text>
                {idx > 0 && (
                  <Text style={[
                    styles.weightDelta,
                    { color: entry.weight_kg <= recentWeights[idx - 1].weight_kg ? '#4CAF50' : '#F44336' }
                  ]}>
                    {entry.weight_kg <= recentWeights[idx - 1].weight_kg ? '▼' : '▲'}
                    {Math.abs(entry.weight_kg - recentWeights[idx - 1].weight_kg).toFixed(1)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* AI-Learned Preferences */}
        <View style={styles.section}>
          <View style={styles.aiHeader}>
            <Text style={styles.sectionTitle}>AI Profile</Text>
            <TouchableOpacity
              style={[styles.aiUpdateBtn, updatingAi && { opacity: 0.6 }]}
              onPress={handleUpdateAiProfile}
              disabled={updatingAi}
            >
              <Text style={styles.aiUpdateBtnText}>
                {updatingAi ? 'Updating...' : '↻ Update'}
              </Text>
            </TouchableOpacity>
          </View>
          {aiProfile?.summary_text ? (
            <Text style={styles.aiSummary}>{aiProfile.summary_text}</Text>
          ) : (
            <Text style={styles.aiEmpty}>AI will learn your preferences over time</Text>
          )}
          {aiProfile?.dietary_preferences?.length > 0 && (
            <View style={styles.tagRow}>
              {aiProfile.dietary_preferences.map((tag: string, idx: number) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {aiProfile?.common_foods?.length > 0 && (
            <View style={styles.tagRow}>
              {aiProfile.common_foods.slice(0, 10).map((tag: string, idx: number) => (
                <View key={idx} style={[styles.tag, styles.foodTag]}>
                  <Text style={[styles.tagText, styles.foodTagText]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  header: { padding: 20, paddingTop: 56, backgroundColor: '#1A1A2E' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  field: { marginHorizontal: 16, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#6C757D', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chipActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  chipText: { fontSize: 14, color: '#6C757D' },
  chipTextActive: { color: '#2E7D32', fontWeight: '600' },
  button: {
    margin: 20,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weightDate: { fontSize: 14, color: '#6C757D', width: 80 },
  weightValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  weightDelta: { fontSize: 12, fontWeight: '600', width: 50, textAlign: 'right' },
  logoutButton: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
  },
  logoutText: { color: '#F44336', fontWeight: '600', fontSize: 15 },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiUpdateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E8F5E9' },
  aiUpdateBtnText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  aiSummary: { fontSize: 13, lineHeight: 20, color: '#1A1A2E', marginBottom: 8 },
  aiEmpty: { fontSize: 13, color: '#6C757D', fontStyle: 'italic', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 11, color: '#2E7D32' },
  foodTag: { backgroundColor: '#FFF3E0' },
  foodTagText: { color: '#E65100' },
});
