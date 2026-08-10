/**
 * "The Study Ledger" — visual identity derived from the subject (a fixed
 * study timetable + attendance register). Paper and ink, signed with a
 * ballpoint-blue accent; green is a tick, red a miss. Deliberately not the
 * generic warm-cream + terracotta look.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1E22',
    background: '#F5F4F0',
    backgroundElement: '#FDFCF9',
    backgroundSelected: '#E9E6DE',
    textSecondary: '#5A5E66',
    border: '#DEDCD6',
    tint: '#2456A0',
    tintSoft: 'rgba(36, 86, 160, 0.12)',
    success: '#1F6B52',
    successSoft: 'rgba(31, 107, 82, 0.12)',
    destructive: '#B3261E',
  },
  dark: {
    text: '#EDEFF3',
    background: '#13161C',
    backgroundElement: '#1B202A',
    backgroundSelected: '#252B36',
    textSecondary: '#A7AEB9',
    border: '#2D333F',
    tint: '#8FB3E4',
    tintSoft: 'rgba(143, 179, 228, 0.16)',
    success: '#4DB890',
    successSoft: 'rgba(77, 184, 144, 0.15)',
    destructive: '#EF9E9B',
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
