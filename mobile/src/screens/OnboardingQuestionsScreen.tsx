import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { Gender, Goal } from '@health-app/shared';
import { supabase } from '../lib/supabase';

type OnboardingData = {
  gender: Gender;
  age: string;
  height_cm: string;
  weight_kg: string;
  goal: Goal;
};

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const GOAL_OPTIONS: { label: string; emoji: string; value: Goal }[] = [
  { label: 'Lose Weight', emoji: '🔥', value: 'lose_weight' },
  { label: 'Maintain', emoji: '⚖️', value: 'maintain' },
  { label: 'Gain Muscle', emoji: '💪', value: 'gain_muscle' },
];

export default function OnboardingQuestionsScreen() {
  const [data, setData] = useState<OnboardingData>({
    gender: 'male',
    age: '',
    height_cm: '',
    weight_kg: '',
    goal: 'lose_weight',
  });
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    const age = parseInt(data.age);
    const height = parseFloat(data.height_cm);
    const weight = parseFloat(data.weight_kg);

    if (!age || age < 10 || age > 120) {
      Alert.alert('Error', 'Please enter a valid age (10-120).');
      return;
    }
    if (!height || height < 100 || height > 250) {
      Alert.alert('Error', 'Please enter a valid height (100-250 cm).');
      return;
    }
    if (!weight || weight < 30 || weight > 300) {
      Alert.alert('Error', 'Please enter a valid weight (30-300 kg).');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save onboarding data to users table
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          gender: data.gender,
          age,
          height_cm: height,
          weight_kg: weight,
          goal: data.goal,
          onboarding_completed: true,
        });

      if (error) throw error;

      // Create initial user profile
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        dietary_preferences: [],
        allergens: [],
        common_foods: [],
        eating_patterns: [],
        activity_level: 'sedentary',
        summary_text: `New user: ${data.gender}, ${age}yo, ${height}cm, ${weight}kg, goal: ${data.goal}`,
      });

      // Auth state listener in AppNavigator will detect onboarding_completed
      // and redirect to MainTabs
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>5 quick questions to personalize your experience</Text>

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.row}>
        {GENDER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, data.gender === opt.value && styles.chipActive]}
            onPress={() => setData({ ...data, gender: opt.value })}
          >
            <Text style={[styles.chipText, data.gender === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Age */}
      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 28"
        placeholderTextColor="#A0AEC0"
        value={data.age}
        onChangeText={(v) => setData({ ...data, age: v })}
        keyboardType="numeric"
      />

      {/* Height */}
      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 170"
        placeholderTextColor="#A0AEC0"
        value={data.height_cm}
        onChangeText={(v) => setData({ ...data, height_cm: v })}
        keyboardType="numeric"
      />

      {/* Weight */}
      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 75"
        placeholderTextColor="#A0AEC0"
        value={data.weight_kg}
        onChangeText={(v) => setData({ ...data, weight_kg: v })}
        keyboardType="numeric"
      />

      {/* Goal */}
      <Text style={styles.label}>Goal</Text>
      <View style={styles.row}>
        {GOAL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, styles.chipLarge, data.goal === opt.value && styles.chipActive]}
            onPress={() => setData({ ...data, goal: opt.value })}
          >
            <Text style={styles.chipEmoji}>{opt.emoji}</Text>
            <Text style={[styles.chipText, data.goal === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Start My Journey</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 8,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E0',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#2D2D44',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3D3D5C',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#2D2D44',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D5C',
    alignItems: 'center',
  },
  chipLarge: {
    flex: 1,
    minWidth: 90,
  },
  chipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
