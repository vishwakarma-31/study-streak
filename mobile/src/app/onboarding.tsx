import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { requestReminderPermission, scheduleReminders } from '@/services/notifications';

type RemindersState = 'idle' | 'requesting' | 'denied';

export default function OnboardingScreen() {
  const { status } = useAuth();
  const router = useRouter();
  const [remindersState, setRemindersState] = useState<RemindersState>('idle');

  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href="/(tabs)" />;

  async function handleEnableReminders() {
    if (remindersState === 'requesting') return;
    setRemindersState('requesting');
    try {
      const granted = await requestReminderPermission();
      if (granted) {
        await scheduleReminders();
        router.replace('/login');
      } else {
        setRemindersState('denied');
      }
    } catch {
      setRemindersState('denied');
    }
  }

  const primaryBusy = remindersState === 'requesting';
  const denied = remindersState === 'denied';

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Your study plan
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        An 8-phase full-stack roadmap with four daily blocks. Complete at least three of the four
        blocks each day to keep the streak alive — verified server-side, so it cannot be gamed.
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        The full roadmap browser is coming soon. For now, create your account and start the first
        day of blocks.
      </ThemedText>

      <ThemedText type="default" themeColor="textSecondary">
        Study reminders follow the daily plan — wake-up, session start, evening block, and a log
        reminder before bed. The app works fine without them.
      </ThemedText>

      {denied ? (
        <ThemedText type="small" themeColor="textSecondary">
          Reminders are off for now. You can enable them later in Settings.
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={primaryBusy}
        onPress={handleEnableReminders}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        {primaryBusy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.buttonLabel}>
            {denied ? 'Continue' : 'Enable reminders'}
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/login')}
        style={({ pressed }) => [styles.skip, pressed && styles.buttonPressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          Skip for now
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
