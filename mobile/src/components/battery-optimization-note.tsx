import { Pressable, StyleSheet, View } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BATTERY_OPTIMIZATION_ACTION = 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS';

type Props = {
  onDone: () => void;
};

export function BatteryOptimizationNote({ onDone }: Props) {
  const theme = useTheme();

  async function openBatterySettings() {
    try {
      await IntentLauncher.startActivityAsync(BATTERY_OPTIMIZATION_ACTION);
    } catch {
      // Some OEMs don't expose this screen; the copy below tells the user where to look manually.
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.tintSoft, borderColor: theme.border }]}>
      <ThemedText type="default">Keep reminders reliable</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Some phones (Xiaomi, OPPO, Vivo, Realme, OnePlus) save battery by putting apps to sleep,
        which can silently stop their notifications. If reminders ever stop arriving, turn off
        battery optimization for Study Streak.
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        onPress={openBatterySettings}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.tint },
          pressed && styles.buttonPressed,
        ]}>
        <ThemedText style={styles.buttonLabel}>Open battery settings</ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={({ pressed }) => [styles.link, pressed && styles.buttonPressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          Got it
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  button: {
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  link: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
