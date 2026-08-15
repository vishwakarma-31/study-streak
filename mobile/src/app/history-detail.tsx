import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LogBlockRow } from '@/components/log-block-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractApiError, fetchLog, type HistoryDetail } from '@/services/api';

const DAY_TYPE_LABEL: Record<HistoryDetail['dayType'], string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function formatDetailDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HistoryDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchLog(date);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (!date) return;
    Promise.resolve().then(() => void load());
  }, [date, load]);

  const blocks = detail?.blocks ?? [];
  const completedCount = blocks.filter((b) => b.completed).length;

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="subtitle">{date ? formatDetailDate(date) : ''}</ThemedText>
          {detail ? (
            <View style={styles.dayTypeRow}>
              <ThemedText type="label" themeColor="tint">
                {DAY_TYPE_LABEL[detail.dayType]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {completedCount} of {blocks.length} blocks
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.closePressed,
          ]}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" style={styles.spacer} />
        ) : error || !detail ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.iconCircle, { backgroundColor: theme.tintSoft }]}>
              <Ionicons name="cloud-offline-outline" size={32} color={theme.tint} />
            </View>
            <ThemedText type="default" style={styles.emptyTitle}>
              Could not load this day
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
              {error ?? 'No log exists for this date.'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            <View style={styles.blocks}>
              {detail.blocks.map((block) => (
                <LogBlockRow
                  key={block.index}
                  index={block.index}
                  label={block.label}
                  time={block.time}
                  completed={block.completed}
                />
              ))}
            </View>

            {detail.customTasks.length > 0 ? (
              <View style={styles.tasksSection}>
                <ThemedText type="label" themeColor="textSecondary">
                  Custom tasks
                </ThemedText>
                <View style={styles.taskList}>
                  {detail.customTasks.map((task, index) => (
                    <View
                      key={`${task.title}-${index}`}
                      style={[styles.taskRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <View
                        style={[
                          styles.taskCheck,
                          { borderColor: task.completed ? theme.success : theme.textSecondary },
                          task.completed && { backgroundColor: theme.success },
                        ]}>
                        {task.completed ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
                      </View>
                      <ThemedText type="default" style={task.completed ? styles.taskTitleDone : undefined}>
                        {task.title}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {detail.note ? (
              <View
                style={[
                  styles.noteCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="label" themeColor="textSecondary">
                  Note
                </ThemedText>
                <ThemedText type="default">{detail.note}</ThemedText>
              </View>
            ) : null}

            {detail.dsaProblems.length > 0 ? (
              <View style={styles.dsaSection}>
                <ThemedText type="label" themeColor="textSecondary">
                  DSA problems
                </ThemedText>
                <View style={styles.chipsRow}>
                  {detail.dsaProblems.map((problem) => (
                    <View key={problem.title} style={[styles.chip, { backgroundColor: theme.tintSoft }]}>
                      <ThemedText type="small" style={[styles.chipText, { color: theme.tint }]}>
                        {problem.title}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  dayTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.7,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  list: {
    gap: Spacing.three,
  },
  blocks: {
    gap: Spacing.two,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  dsaSection: {
    gap: Spacing.one,
  },
  tasksSection: {
    gap: Spacing.one,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  chipText: {
    fontWeight: '700',
  },
  spacer: {
    marginTop: Spacing.six,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyBody: {
    textAlign: 'center',
  },
});
