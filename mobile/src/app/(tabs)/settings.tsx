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
  ALARM_DURATION_OPTIONS,
  cancelReminders,
  getAlarmPermissionState,
  getReminderPermission,
  getReminderSettings,
  getScheduledReminderCount,
  isAlarmSupported,
  openAlarmPermissionSettings,
  REMINDER_META,
  requestReminderPermission,
  scheduleReminders,
  updateReminderSetting,
} from '@/services/notifications';
import type { AlarmDuration, ReminderId, ReminderMode, ReminderSettings } from '@/services/notifications';
import { getBatteryHintShown, setBatteryHintShown } from '@/services/storage';

export default function SettingsScreen() {
  const { status, signOut } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null);
  const [alarmPermissionOk, setAlarmPermissionOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showBatteryHint, setShowBatteryHint] = useState(false);

  const alarmSupported = isAlarmSupported();

  const anyAlarm = reminderSettings
    ? REMINDER_META.some((meta) => reminderSettings[meta.id]?.mode === 'alarm')
    : false;

  useEffect(() => {
    Promise.resolve()
      .then(async () => {
        const [count, granted, settings, alarmOk] = await Promise.all([
          getScheduledReminderCount(),
          getReminderPermission(),
          getReminderSettings(),
          getAlarmPermissionState(),
        ]);
        setRemindersOn(count > 0 && granted);
        setPermissionBlocked(!granted);
        setReminderSettings(settings);
        setAlarmPermissionOk(alarmOk);
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

  async function handleToggleReminder(id: ReminderId) {
    if (!reminderSettings || busy) return;
    setBusy(true);
    try {
      const settings = reminderSettings;
      const next = { ...settings[id], enabled: !settings[id].enabled };
      setReminderSettings({ ...settings, [id]: next });
      await updateReminderSetting(id, next);
      if (remindersOn) {
        await scheduleReminders();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectMode(id: ReminderId, mode: ReminderMode) {
    if (!reminderSettings || busy) return;
    setBusy(true);
    try {
      const settings = reminderSettings;
      const next = { ...settings[id], mode };
      setReminderSettings({ ...settings, [id]: next });
      await updateReminderSetting(id, next);
      if (remindersOn) {
        await scheduleReminders();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectDuration(id: ReminderId, minutes: AlarmDuration) {
    if (!reminderSettings || busy) return;
    setBusy(true);
    try {
      const settings = reminderSettings;
      const next = { ...settings[id], alarmDurationMinutes: minutes };
      setReminderSettings({ ...settings, [id]: next });
      await updateReminderSetting(id, next);
      if (remindersOn) {
        await scheduleReminders();
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

        {remindersLoading ? null : (
          <View style={styles.reminderList}>
            {REMINDER_META.map((meta) => {
              const setting = reminderSettings?.[meta.id];
              if (!setting) return null;
              const limitedAlarm = setting.mode === 'alarm' && !alarmSupported;
              return (
                <View
                  key={meta.id}
                  style={[
                    styles.reminderRow,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}>
                  <View style={styles.reminderTextWrap}>
                    <ThemedText type="default">{meta.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {meta.schedule}
                    </ThemedText>
                  </View>

                  <View style={styles.pillRow}>
                    <ModePill
                      label="Notification"
                      selected={setting.mode === 'notification'}
                      disabled={busy}
                      onPress={() => handleSelectMode(meta.id, 'notification')}
                    />
                    <ModePill
                      label="Alarm"
                      selected={setting.mode === 'alarm'}
                      disabled={busy || !alarmSupported}
                      onPress={() => handleSelectMode(meta.id, 'alarm')}
                    />
                  </View>

                  {setting.mode === 'alarm' ? (
                    <View style={styles.durationRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Ring for
                      </ThemedText>
                      {ALARM_DURATION_OPTIONS.map((minutes) => (
                        <ModePill
                          key={minutes}
                          label={`${minutes} min`}
                          selected={setting.alarmDurationMinutes === minutes}
                          disabled={busy}
                          onPress={() => handleSelectDuration(meta.id, minutes)}
                        />
                      ))}
                    </View>
                  ) : null}

                  {limitedAlarm ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Alarm mode needs the installed build (not available in Expo Go). Using a
                      standard notification instead.
                    </ThemedText>
                  ) : setting.mode === 'alarm' && !alarmPermissionOk ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void openAlarmPermissionSettings()}>
                      <ThemedText type="small" themeColor="destructive">
                        Exact-alarm permission is off — open system settings
                      </ThemedText>
                    </Pressable>
                  ) : null}

                  <Switch
                    value={setting.enabled}
                    disabled={busy}
                    onValueChange={() => handleToggleReminder(meta.id)}
                    trackColor={{ false: theme.border, true: theme.tint }}
                    thumbColor={setting.enabled ? '#ffffff' : undefined}
                    accessibilityLabel={`${meta.label} enabled`}
                  />
                </View>
              );
            })}
          </View>
        )}

        {anyAlarm ? (
          <ThemedText type="small" themeColor="textSecondary">
            Alarm mode uses the same system pathway as the built-in alarm clock, so it is more
            reliable than a plain notification. Battery-saving settings on some phones can still
            interfere with it, so the battery-optimization prompt stays relevant.
          </ThemedText>
        ) : null}

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

function ModePill({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: theme.border },
        selected && { backgroundColor: theme.tintSoft, borderColor: theme.tint },
        disabled && styles.pillDisabled,
        pressed && styles.buttonPressed,
      ]}>
      <ThemedText
        type="small"
        themeColor={selected ? undefined : 'textSecondary'}
        style={selected ? { color: theme.tint, fontWeight: '700' } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
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
  reminderList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  reminderRow: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reminderTextWrap: {
    gap: Spacing.half,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pillDisabled: {
    opacity: 0.5,
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
