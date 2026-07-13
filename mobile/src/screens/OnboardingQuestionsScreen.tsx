import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OnboardingQuestionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>5 quick questions to personalize your experience</Text>
      <Text style={styles.note}>(Onboarding form — Ticket #3)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 12,
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 24,
    fontStyle: 'italic',
  },
});
