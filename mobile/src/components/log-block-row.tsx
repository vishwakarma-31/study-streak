import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LogBlockRowProps = {
  index: number;
  label: string;
  time: string;
  completed: boolean;
};

// Read-only rendering of one day's block, using the exact completed/missed
// visual language from the Today screen's BlockCard so a past day reads the
// same as the live one: green fill + check + strikethrough when done, dimmed
// card when missed.
export function LogBlockRow({ index, label, time, completed }: LogBlockRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: completed ? theme.successSoft : theme.backgroundElement,
          borderColor: completed ? theme.success : theme.border,
        },
        !completed && styles.missed,
      ]}>
      <View
        style={[
          styles.check,
          {
            borderColor: completed ? theme.success : theme.textSecondary,
            backgroundColor: completed ? theme.success : 'transparent',
          },
        ]}>
        {completed ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
      </View>

      <View style={styles.textColumn}>
        <ThemedText
          type="default"
          themeColor={completed ? 'textSecondary' : 'text'}
          style={completed ? styles.checkedLabel : undefined}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {time}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
        {index}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  missed: {
    opacity: 0.55,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  checkedLabel: {
    textDecorationLine: 'line-through',
  },
  index: {
    alignSelf: 'flex-start',
  },
});
