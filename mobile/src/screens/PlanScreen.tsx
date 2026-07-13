import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyPlan, generateWeeklyPlan } from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const EXERCISE_EMOJI: Record<string, string> = {
  walking: '🚶', running: '🏃', cycling: '🚴', swimming: '🏊',
  gym: '🏋️', yoga: '🧘', hiit: '⚡', sports: '⚽', other: '🏅',
};

export default function PlanScreen() {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  const loadPlan = useCallback(async () => {
    try {
      const data = await getWeeklyPlan();
      setPlan(data);
    } catch (err: any) {
      console.error('Failed to load plan:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await generateWeeklyPlan();
      setPlan(data);
      Alert.alert('Plan Ready', 'Your weekly plan has been generated!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGenerating(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadPlan();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Plan</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No Plan Yet</Text>
          <Text style={styles.emptyText}>
            Generate a personalized 7-day meal and exercise plan based on your profile and recent activity.
          </Text>
          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            <Text style={styles.generateBtnText}>
              {generating ? 'Generating...' : 'Generate My Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dayTarget = plan.daily_targets?.find((d: any) => d.day === selectedDay);
  const dayMeals = plan.meal_suggestions?.filter((m: any) => m.day === selectedDay) || [];
  const dayExercise = plan.exercise_suggestions?.filter((e: any) => e.day === selectedDay) || [];

  const totalMealCal = dayMeals.reduce((s: number, m: any) => s + (m.estimated_calories || 0), 0);
  const totalExCal = dayExercise.reduce((s: number, e: any) => s + (e.estimated_calories_burned || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Weekly Plan</Text>
          <Text style={styles.subtitle}>Week of {plan.week_start_date}</Text>
        </View>
        <TouchableOpacity
          style={styles.regenBtn}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Text style={styles.regenBtnText}>{generating ? '...' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={styles.dayAbbr}>{day.slice(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Daily Target */}
      {dayTarget && (
        <View style={styles.targetCard}>
          <View style={styles.targetRow}>
            <View style={styles.targetItem}>
              <Text style={styles.targetValue}>{dayTarget.calorie_target}</Text>
              <Text style={styles.targetLabel}>kcal target</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetItem}>
              <Text style={styles.targetValue}>{totalMealCal}</Text>
              <Text style={styles.targetLabel}>planned</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetItem}>
              <Text style={[styles.targetValue, { color: '#FF9800' }]}>{totalExCal}</Text>
              <Text style={styles.targetLabel}>burned</Text>
            </View>
          </View>
          <Text style={styles.focusText}>{dayTarget.focus}</Text>
        </View>
      )}

      {/* Meals */}
      <Text style={styles.sectionTitle}>Meals</Text>
      {dayMeals.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>No meals planned for {selectedDay}</Text>
        </View>
      ) : (
        dayMeals.map((meal: any, idx: number) => (
          <View key={idx} style={styles.mealCard}>
            <Text style={styles.mealEmoji}>{MEAL_EMOJI[meal.meal_type] || '🍽️'}</Text>
            <View style={styles.mealInfo}>
              <Text style={styles.mealType}>{meal.meal_type}</Text>
              <Text style={styles.mealSuggestion} numberOfLines={2}>{meal.suggestion}</Text>
              <Text style={styles.mealCal}>{meal.estimated_calories} kcal</Text>
            </View>
          </View>
        ))
      )}

      {/* Exercise */}
      <Text style={styles.sectionTitle}>Exercise</Text>
      {dayExercise.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>Rest day 🧘</Text>
        </View>
      ) : (
        dayExercise.map((ex: any, idx: number) => (
          <View key={idx} style={styles.exerciseCard}>
            <Text style={styles.exerciseEmoji}>{EXERCISE_EMOJI[ex.exercise_type] || '🏅'}</Text>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseDesc}>{ex.description}</Text>
              <Text style={styles.exerciseDetail}>
                {ex.duration_minutes} min · {ex.estimated_calories_burned} kcal
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Regenerate at bottom */}
      <TouchableOpacity
        style={[styles.regenBottomBtn, generating && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={generating}
      >
        <Text style={styles.regenBottomText}>
          {generating ? 'Regenerating...' : 'Regenerate Plan'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  header: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#A0AEC0', marginTop: 4 },
  regenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D2D44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenBtnText: { color: '#4CAF50', fontSize: 20 },
  dayScroll: {
    maxHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  dayChipActive: { backgroundColor: '#4CAF50' },
  dayAbbr: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  targetCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  targetItem: { alignItems: 'center' },
  targetValue: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  targetLabel: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  targetDivider: { width: 1, backgroundColor: '#E9ECEF', marginVertical: 4 },
  focusText: { fontSize: 13, color: '#4CAF50', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginLeft: 16, marginBottom: 8, marginTop: 8 },
  emptyDay: { alignItems: 'center', paddingVertical: 20 },
  emptyDayText: { fontSize: 14, color: '#6C757D' },
  mealCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  mealEmoji: { fontSize: 28 },
  mealInfo: { flex: 1 },
  mealType: { fontSize: 11, color: '#6C757D', textTransform: 'uppercase', fontWeight: '600' },
  mealSuggestion: { fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginTop: 2 },
  mealCal: { fontSize: 12, color: '#4CAF50', fontWeight: '700', marginTop: 2 },
  exerciseCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseEmoji: { fontSize: 28 },
  exerciseInfo: { flex: 1 },
  exerciseDesc: { fontSize: 14, fontWeight: '500', color: '#1A1A2E' },
  exerciseDetail: { fontSize: 12, color: '#6C757D', marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6C757D', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  generateBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  regenBottomBtn: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  regenBottomText: { color: '#4CAF50', fontWeight: '600', fontSize: 15 },
});
