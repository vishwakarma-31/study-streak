import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BlockCardProps = {
  index: number;
  label: string;
  time: string;
  checked: boolean;
  onPress: () => void;
};

const ACCENT = '#3c87f7';

export function BlockCard({ index, label, time, checked, onPress }: BlockCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}, ${time}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme[checked ? 'backgroundSelected' : 'backgroundElement'],
          borderColor: checked ? ACCENT : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.check,
          {
            borderColor: checked ? ACCENT : theme.textSecondary,
            backgroundColor: checked ? ACCENT : 'transparent',
          },
        ]}>
        {checked ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
      </View>

      <View style={styles.textColumn}>
        <ThemedText type="default" style={checked ? styles.checkedLabel : undefined}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {time}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
        {index + 1}
      </ThemedText>
    </Pressable>
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
  pressed: {
    opacity: 0.85,
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
