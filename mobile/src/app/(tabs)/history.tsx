import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function HistoryScreen() {
  const { status } = useAuth();

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', padding: Spacing.four }}>
      <ThemedText type="subtitle">History</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Past daily notes and DSA problem logs will show up here.
      </ThemedText>
    </ThemedView>
  );
}
