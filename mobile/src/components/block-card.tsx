import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBlockState } from '@/services/date';

type BlockCardProps = {
  index: number;
  label: string;
  time: string;
  checked: boolean;
  onPress: () => void;
};

export function BlockCard({ index, label, time, checked, onPress }: BlockCardProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const state = getBlockState(checked, time);
  const completed = state === 'completed';
  const active = state === 'active';
  const missed = state === 'missed';

  const backgroundColor = completed
    ? theme.successSoft
    : active
      ? theme.tintSoft
      : theme.backgroundElement;
  const borderColor = completed ? theme.success : active ? theme.tint : theme.border;
  const checkColor = completed ? theme.success : active ? theme.tint : theme.textSecondary;
  const labelColor = completed || missed ? 'textSecondary' : 'text';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}, ${time}`}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) scale.set(withSpring(0.98, { damping: 20, stiffness: 300 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 20, stiffness: 300 }));
      }}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor, borderColor },
          missed && styles.missed,
          animatedStyle,
        ]}>
        <View
          style={[
            styles.check,
            {
              borderColor: checkColor,
              backgroundColor: completed || active ? checkColor : 'transparent',
            },
          ]}>
          {completed ? (
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          ) : active ? (
            <View style={[styles.nowDot, { backgroundColor: theme.text }]} />
          ) : null}
        </View>

        <View style={styles.textColumn}>
          <ThemedText type="default" themeColor={labelColor} style={completed ? styles.checkedLabel : undefined}>
            {label}
          </ThemedText>
          <ThemedText
            type="time"
            themeColor={active ? 'tint' : 'textSecondary'}
            style={active ? styles.activeTime : undefined}>
            {time}
            {active ? '  — now' : ''}
          </ThemedText>
        </View>

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.index}>
          {index + 1}
        </ThemedText>
      </Animated.View>
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
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  checkedLabel: {
    textDecorationLine: 'line-through',
  },
  activeTime: {
    fontWeight: '700',
  },
  index: {
    alignSelf: 'flex-start',
  },
});
