import { useEffect, type PropsWithChildren } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type FadeInViewProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeInView({ delay = 0, style, children }: FadeInViewProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(12);

  useEffect(() => {
    if (reduced) {
      opacity.set(1);
      offset.set(0);
      return;
    }
    opacity.set(withDelay(delay, withTiming(1, { duration: 320 })));
    offset.set(withDelay(delay, withTiming(0, { duration: 320 })));
  }, [delay, opacity, offset, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: offset.get() }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
