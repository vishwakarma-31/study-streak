import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { BatteryOptimizationNote } from '@/components/battery-optimization-note';
import { FadeInView } from '@/components/fade-in-view';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import {
  cancelReminders,
  getReminderPermission,
  getScheduledReminderCount,
  REMINDER_SCHEDULE_LINES,
  requestReminderPermission,
  scheduleReminders,
} from '@/services/notifications';
import { getBatteryHintShown, setBatteryHintShown } from '@/services/storage';

export default function SettingsScreen() {
  const { status, signOut } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showBatteryHint, setShowBatteryHint] = useState(false);

  useEffect(() => {
    Promise.resolve()
      .then(async () => {
        const [count, granted] = await Promise.all([
          getScheduledReminderCount(),
          getReminderPermission(),
        ]);
        setRemindersOn(count > 0 && granted);
        setPermissionBlocked(!granted);
        setRemindersLoading(false);
      })
      .catch(() => setRemindersLoading(false));
  }, []);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  async function handleToggleReminders(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const granted = await requestReminderPermission();
        if (granted) {
          await scheduleReminders();
          setRemindersOn(true);
          setPermissionBlocked(false);
          if (Platform.OS === 'android' && !(await getBatteryHintShown())) {
            setShowBatteryHint(true);
          }
        } else {
          setRemindersOn(false);
          setPermissionBlocked(true);
        }
      } else {
        await cancelReminders();
        setRemindersOn(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  async function handleBatteryHintDone() {
    await setBatteryHintShown();
    setShowBatteryHint(false);
  }

  return (
    <Screen style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Settings
      </ThemedText>

      <View style={styles.section}>
        <ThemedText type="default">Study reminders</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Local notifications that follow the study plan. Times are fixed to the daily routine and
          can be reviewed below.
        </ThemedText>

        <View style={styles.toggleRow}>
          <ThemedText type="default">Reminders enabled</ThemedText>
          {remindersLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Switch
              value={remindersOn}
              disabled={busy}
              onValueChange={handleToggleReminders}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor={remindersOn ? '#ffffff' : undefined}
              accessibilityLabel="Study reminders enabled"
            />
          )}
        </View>

        {permissionBlocked && remindersLoading === false ? (
          <ThemedText type="small" themeColor="textSecondary">
            Notifications are blocked in system settings. Reminders stay off until you allow them
            there.
          </ThemedText>
        ) : null}

        <View style={styles.schedule}>
          {REMINDER_SCHEDULE_LINES.map((line) => (
            <ThemedText key={line} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </View>

        {showBatteryHint ? (
          <BatteryOptimizationNote onDone={handleBatteryHintDone} />
        ) : null}
      </View>

      <FadeInView>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.button,
            { borderColor: theme.destructive },
            pressed && styles.buttonPressed,
          ]}>
          <ThemedText style={[styles.buttonLabel, { color: theme.destructive }]}>Sign out</ThemedText>
        </Pressable>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginTop: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  schedule: {
    gap: Spacing.half,
    marginTop: Spacing.one,
  },
  button: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.four,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    fontWeight: '600',
  },
});
