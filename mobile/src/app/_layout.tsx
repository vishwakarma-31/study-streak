import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { ensureScheduleExists } from '@/services/notifications';

function ReminderSync() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn') return;
    Promise.resolve()
      .then(() => ensureScheduleExists())
      .catch(() => {});
  }, [status]);

  return null;
}

function RootNavigator() {
  return (
    <>
      <StatusBar style="auto" />
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
