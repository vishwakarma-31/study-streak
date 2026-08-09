import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView, type ThemedViewProps } from '@/components/themed-view';

type ScreenProps = ThemedViewProps & {
  /** Also apply the bottom safe-area inset. Set for full-screen routes (no tab bar). */
  insetBottom?: boolean;
};

export function Screen({ style, insetBottom = false, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[
        styles.screen,
        style,
        {
          paddingTop: insets.top,
          paddingBottom: insetBottom ? insets.bottom : 0,
        },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
