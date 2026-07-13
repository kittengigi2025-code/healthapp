import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { logExercise, getTodayExercises } from '../lib/api';
import type { ExerciseType } from '@health-app/shared';

const EXERCISE_OPTIONS: { value: ExerciseType; label: string; emoji: string }[] = [
  { value: 'walking', label: 'Walking', emoji: '🚶' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'gym', label: 'Gym', emoji: '🏋️' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'hiit', label: 'HIIT', emoji: '⚡' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'other', label: 'Other', emoji: '🏅' },
];

export default function ExerciseScreen() {
  const navigation = useNavigation<any>();
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const [duration, setDuration] = useState('');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);

  const loadExercises = useCallback(async () => {
    try {
      const data = await getTodayExercises();
      setExercises(data || []);
    } catch (err: any) {
      console.error('Failed to load exercises:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadExercises(); }, [loadExercises]));

  async function handleLog() {
    if (!selectedType) {
      Alert.alert('Select Exercise', 'Please choose an exercise type.');
      return;
    }
    const mins = Number(duration);
    if (!mins || mins < 1) {
      Alert.alert('Invalid Duration', 'Please enter how many minutes.');
      return;
    }

    setSaving(true);
    try {
      await logExercise({
        exercise_type: selectedType,
        exercise_name: selectedType === 'other' ? customName || 'Other' : undefined,
        duration_minutes: mins,
      });
      Alert.alert('Logged!', 'Exercise recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalBurned = exercises.reduce((sum, e) => sum + (e.estimated_calories_burned || 0), 0);
  const totalMinutes = exercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Log Exercise</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Exercise Type Grid */}
        <Text style={styles.sectionLabel}>Exercise Type</Text>
        <View style={styles.grid}>
          {EXERCISE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.typeCard, selectedType === opt.value && styles.typeCardActive]}
              onPress={() => setSelectedType(opt.value)}
            >
              <Text style={styles.typeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.typeLabel, selectedType === opt.value && styles.typeLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Name for "other" */}
        {selectedType === 'other' && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Custom Name</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Badminton"
            />
          </View>
        )}

        {/* Duration */}
        <View style={styles.field}>
          <Text style={styles.sectionLabel}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
            placeholder="30"
          />
          {/* Quick duration buttons */}
          <View style={styles.quickRow}>
            {[15, 30, 45, 60].map((m) => (
              <TouchableOpacity key={m} style={styles.quickBtn} onPress={() => setDuration(String(m))}>
                <Text style={styles.quickText}>{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Log Button */}
        <TouchableOpacity
          style={[styles.logButton, saving && styles.logButtonDisabled]}
          onPress={handleLog}
          disabled={saving}
        >
          <Text style={styles.logButtonText}>{saving ? 'Logging...' : 'Log Exercise'}</Text>
        </TouchableOpacity>

        {/* Today's Exercises */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Exercises</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>{totalMinutes} min total</Text>
              <Text style={styles.summaryText}>{totalBurned} kcal burned</Text>
            </View>
            {exercises.map((e: any) => {
              const opt = EXERCISE_OPTIONS.find((o) => o.value === e.exercise_type);
              return (
                <View key={e.id} style={styles.exerciseRow}>
                  <Text style={styles.exerciseEmoji}>{opt?.emoji || '🏅'}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>
                      {e.exercise_name || opt?.label || e.exercise_type}
                    </Text>
                    <Text style={styles.exerciseDetail}>
                      {e.duration_minutes} min · {e.estimated_calories_burned} kcal
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 56,
    backgroundColor: '#1A1A2E',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  closeBtn: { fontSize: 24, color: '#FFFFFF' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6C757D', marginTop: 16, marginHorizontal: 16, marginBottom: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 8,
  },
  typeCard: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  typeCardActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  typeEmoji: { fontSize: 28, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: '#6C757D' },
  typeLabelActive: { color: '#2E7D32', fontWeight: '600' },
  field: { marginHorizontal: 16, marginTop: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  quickText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  logButton: {
    margin: 20,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonDisabled: { opacity: 0.6 },
  logButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryText: { fontSize: 13, color: '#6C757D', fontWeight: '600' },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  exerciseEmoji: { fontSize: 24 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  exerciseDetail: { fontSize: 12, color: '#6C757D', marginTop: 2 },
});
