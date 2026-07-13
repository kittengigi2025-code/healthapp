import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import PlanScreen from '../screens/PlanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingScreen, { type OnboardingStackParamList } from '../screens/OnboardingScreen';
import OnboardingQuestionsScreen from '../screens/OnboardingQuestionsScreen';

// --- Tab Navigator Types ---
export type TabParamList = {
  Home: undefined;
  Camera: undefined;
  Plan: undefined;
  Profile: undefined;
};

// --- Root Navigator Types ---
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// --- Tab icon component ---
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Camera: '📷',
    Plan: '📋',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '•'}
    </Text>
  );
}

// --- Main Tab Navigator ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#6C757D',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E9ECEF',
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Camera" component={CameraScreen} options={{ title: 'Camera' }} />
      <Tab.Screen name="Plan" component={PlanScreen} options={{ title: 'Plan' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// --- Onboarding Stack ---
function OnboardingFlow() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={OnboardingScreen} />
      <OnboardingStack.Screen name="OnboardingQuestions" component={OnboardingQuestionsScreen} />
    </OnboardingStack.Navigator>
  );
}

// --- Root Navigator ---
// TODO (Ticket #3): Use auth state to decide whether to show Onboarding or MainTabs
export default function AppNavigator() {
  // For now, default to Onboarding (unauthenticated state)
  // Ticket #3 will add auth-based conditional routing here
  const isAuthenticated = false;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Onboarding" component={OnboardingFlow} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
