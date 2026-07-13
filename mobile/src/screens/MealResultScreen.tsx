import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { AnalyzeMealResponse, IdentifiedFood } from '@health-app/shared';
import { saveMeal } from '../lib/api';
import { useNavigation } from '@react-navigation/native';

type RouteParams = {
  photoUrl: string;
  analysis: AnalyzeMealResponse;
};

export default function MealResultScreen({ route }: { route: { params: RouteParams } }) {
  const navigation = useNavigation();
  const { photoUrl, analysis } = route.params;

  const [foods, setFoods] = useState<IdentifiedFood[]>(analysis.identified_foods);
  const [saving, setSaving] = useState(false);

  function updateFood(index: number, field: keyof IdentifiedFood, value: string | number) {
    const updated = [...foods];
    updated[index] = { ...updated[index], [field]: value };
    setFoods(updated);
  }

  function recalcTotal() {
    return {
      total_calories: foods.reduce((sum, f) => sum + (Number(f.calories) || 0), 0),
      total_protein_g: foods.reduce((sum, f) => sum + (Number(f.protein_g) || 0), 0),
      total_carbs_g: foods.reduce((sum, f) => sum + (Number(f.carbs_g) || 0), 0),
      total_fat_g: foods.reduce((sum, f) => sum + (Number(f.fat_g) || 0), 0),
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const nutrition = recalcTotal();
      await saveMeal({
        photo_url: photoUrl,
        identified_foods: foods,
        nutrition,
        ai_feedback: analysis.ai_feedback,
      });
      Alert.alert('Saved!', 'Meal logged successfully.', [
        { text: 'OK', onPress: () => (navigation as any).navigate('Main') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save meal.');
    } finally {
      setSaving(false);
    }
  }

  const totals = recalcTotal();

  return (
    <ScrollView style={styles.container}>
      {/* Photo */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      ) : null}

      {/* AI Feedback */}
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackLabel}>AI Feedback</Text>
        <Text style={styles.feedbackText}>{analysis.ai_feedback}</Text>
      </View>

      {/* Total Calories */}
      <View style={styles.totalCard}>
        <Text style={styles.totalCalories}>{totals.total_calories}</Text>
        <Text style={styles.totalLabel}>kcal total</Text>
        <View style={styles.macroRow}>
          <MacroBadge label="Protein" value={totals.total_protein_g} color="#4CAF50" />
          <MacroBadge label="Carbs" value={totals.total_carbs_g} color="#FF9800" />
          <MacroBadge label="Fat" value={totals.total_fat_g} color="#F44336" />
        </View>
      </View>

      {/* Food Items (editable) */}
      <Text style={styles.sectionTitle}>Identified Foods</Text>
      <Text style={styles.editHint}>Tap values to edit</Text>

      {foods.map((food, index) => (
        <View key={index} style={styles.foodCard}>
          <TextInput
            style={styles.foodName}
            value={food.name}
            onChangeText={(v) => updateFood(index, 'name', v)}
          />
          <View style={styles.foodRow}>
            <EditableField label="kcal" value={food.calories} onChange={(v) => updateFood(index, 'calories', Number(v) || 0)} />
            <EditableField label="P" value={food.protein_g} onChange={(v) => updateFood(index, 'protein_g', Number(v) || 0)} />
            <EditableField label="C" value={food.carbs_g} onChange={(v) => updateFood(index, 'carbs_g', Number(v) || 0)} />
            <EditableField label="F" value={food.fat_g} onChange={(v) => updateFood(index, 'fat_g', Number(v) || 0)} />
          </View>
        </View>
      ))}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Confirm & Save</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function MacroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{value}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.editField}>
      <TextInput
        style={styles.editInput}
        value={String(value)}
        onChangeText={onChange}
        keyboardType="numeric"
      />
      <Text style={styles.editLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  photo: { width: '100%', height: 250, resizeMode: 'cover' },
  feedbackCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  feedbackLabel: { fontSize: 12, fontWeight: '700', color: '#4CAF50', marginBottom: 4 },
  feedbackText: { fontSize: 14, color: '#1A1A2E', lineHeight: 20 },
  totalCard: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalCalories: { fontSize: 42, fontWeight: '800', color: '#1A1A2E' },
  totalLabel: { fontSize: 14, color: '#6C757D', marginTop: -4 },
  macroRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroLabel: { fontSize: 12, color: '#6C757D' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 24, marginLeft: 16 },
  editHint: { fontSize: 12, color: '#6C757D', marginLeft: 16, marginBottom: 8 },
  foodCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  foodName: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  foodRow: { flexDirection: 'row', gap: 8 },
  editField: { flex: 1, alignItems: 'center' },
  editInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    minWidth: 50,
    width: '100%',
  },
  editLabel: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
