/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1917',
    background: '#FFFBEB',
    backgroundElement: '#FFF6E3',
    backgroundSelected: '#F5E8CF',
    textSecondary: '#6B6259',
    border: '#EADFC8',
    tint: '#B45309',
    tintSoft: 'rgba(180, 83, 9, 0.12)',
    success: '#047857',
    successSoft: 'rgba(4, 120, 87, 0.12)',
    destructive: '#DC2626',
  },
  dark: {
    text: '#F7F1E7',
    background: '#15110C',
    backgroundElement: '#211B13',
    backgroundSelected: '#2D251A',
    textSecondary: '#B0A48F',
    border: '#38301F',
    tint: '#F59E0B',
    tintSoft: 'rgba(245, 158, 11, 0.16)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    destructive: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
