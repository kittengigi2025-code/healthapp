import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getDailyStats, getTodayMeals, getTodayExercises, getDailySummary, generateDailySummary } from '../lib/api';
import type { DailyStatsResponse } from '@health-app/shared';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsData, mealsData, exercisesData, summaryData] = await Promise.all([
        getDailyStats(),
        getTodayMeals(),
        getTodayExercises(),
        getDailySummary().catch(() => null),
      ]);
      setStats(statsData);
      setMeals(mealsData);
      setExercises(exercisesData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true);
    try {
      const data = await generateDailySummary();
      setSummary(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGeneratingSummary(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const intake = stats?.total_intake_calories || 0;
  const target = stats?.daily_target_calories || 2000;
  const expenditure = stats?.total_expenditure_calories || 0;
  const gap = stats?.calorie_gap || target;
  const progress = Math.min(1, intake / target);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Today</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
      </View>

      {/* Calorie Gauge */}
      <View style={styles.gaugeCard}>
        <View style={styles.gaugeRow}>
          <View style={styles.gaugeCircle}>
            <Text style={styles.gaugeValue}>{intake}</Text>
            <Text style={styles.gaugeLabel}>kcal eaten</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <InfoRow label="Target" value={`${target} kcal`} color="#4CAF50" />
            <InfoRow label="Remaining" value={`${Math.max(0, gap)} kcal`} color={gap > 0 ? '#2196F3' : '#F44336'} />
            <InfoRow label="Burned" value={`${expenditure} kcal`} color="#FF9800" />
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progress > 1 ? '#F44336' : '#4CAF50' }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress * 100)}% of daily target</Text>
      </View>

      {/* Today's Meals */}
      <Text style={styles.sectionTitle}>Today's Meals</Text>

      {meals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyText}>No meals logged yet today</Text>
          <Text style={styles.emptyHint}>Tap the Camera tab to log your first meal!</Text>
        </View>
      ) : (
        meals.map((meal: any) => (
          <View key={meal.id} style={styles.mealCard}>
            {meal.photo_url ? (
              <Image source={{ uri: meal.photo_url }} style={styles.mealThumb} />
            ) : (
              <View style={[styles.mealThumb, styles.mealThumbPlaceholder]}>
                <Text style={{ fontSize: 24 }}>🍽️</Text>
              </View>
            )}
            <View style={styles.mealInfo}>
              <Text style={styles.mealName} numberOfLines={1}>
                {meal.identified_foods?.map((f: any) => f.name).join(', ') || 'Meal'}
              </Text>
              <Text style={styles.mealCalories}>
                {meal.nutrition?.total_calories || 0} kcal
              </Text>
              <Text style={styles.mealTime}>
                {new Date(meal.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Exercise Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Exercise</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Exercise')}>
          <Text style={styles.addBtn}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {exercises.length === 0 ? (
        <View style={styles.emptyExercise}>
          <Text style={styles.emptyText}>No exercise logged today</Text>
          <Text style={styles.emptyHint}>Tap + Log to record a workout!</Text>
        </View>
      ) : (
        exercises.map((e: any) => {
          const emojiMap: Record<string, string> = {
            walking: '🚶', running: '🏃', cycling: '🚴', swimming: '🏊',
            gym: '🏋️', yoga: '🧘', hiit: '⚡', sports: '⚽', other: '🏅',
          };
          return (
            <View key={e.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseEmoji}>{emojiMap[e.exercise_type] || '🏅'}</Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{e.exercise_name || e.exercise_type}</Text>
                <Text style={styles.exerciseDetail}>
                  {e.duration_minutes} min · {e.estimated_calories_burned} kcal burned
                </Text>
              </View>
            </View>
          );
        })
      )}

      {/* AI Daily Summary */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Summary</Text>
        {!summary && meals.length > 0 && (
          <TouchableOpacity onPress={handleGenerateSummary} disabled={generatingSummary}>
            <Text style={styles.addBtn}>{generatingSummary ? '...' : '+ Generate'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{summary.ai_summary}</Text>
          {summary.ai_suggestions?.length > 0 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>Suggestions for tomorrow:</Text>
              {summary.ai_suggestions.map((s: string, idx: number) => (
                <Text key={idx} style={styles.suggestionItem}>• {s}</Text>
              ))}
            </View>
          )}
        </View>
      ) : meals.length === 0 ? (
        <View style={styles.emptyExercise}>
          <Text style={styles.emptyText}>Log a meal first to get AI summary</Text>
        </View>
      ) : (
        <View style={styles.emptyExercise}>
          <Text style={styles.emptyText}>No summary yet today</Text>
          <TouchableOpacity style={styles.summaryBtn} onPress={handleGenerateSummary} disabled={generatingSummary}>
            <Text style={styles.summaryBtnText}>
              {generatingSummary ? 'Generating...' : 'Generate Daily Summary'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  header: { padding: 20, paddingTop: 56, backgroundColor: '#1A1A2E' },
  greeting: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  date: { fontSize: 14, color: '#A0AEC0', marginTop: 4 },
  gaugeCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  gaugeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  gaugeLabel: { fontSize: 11, color: '#6C757D' },
  gaugeInfo: { flex: 1, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#6C757D' },
  infoValue: { fontSize: 13, fontWeight: '700' },
  progressBar: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: { fontSize: 12, color: '#6C757D', textAlign: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginLeft: 16, marginBottom: 8 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  emptyHint: { fontSize: 13, color: '#6C757D', marginTop: 6 },
  mealCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  mealThumb: { width: 64, height: 64 },
  mealThumbPlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  mealName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  mealCalories: { fontSize: 13, fontWeight: '700', color: '#4CAF50', marginTop: 2 },
  mealTime: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  addBtn: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  emptyExercise: { alignItems: 'center', paddingVertical: 24 },
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
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  exerciseDetail: { fontSize: 12, color: '#6C757D', marginTop: 2 },
  summaryCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryText: { fontSize: 14, lineHeight: 22, color: '#1A1A2E' },
  suggestionsBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  suggestionsTitle: { fontSize: 13, fontWeight: '700', color: '#4CAF50', marginBottom: 6 },
  suggestionItem: { fontSize: 13, color: '#6C757D', lineHeight: 20, marginTop: 4 },
  summaryBtn: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  summaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
