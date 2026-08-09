import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { StreakHistoryEntry } from '@/services/api';
import { toDateString } from '@/services/date';

const CELL_SIZE = 14;
const CELL_GAP = 3;

export const HEATMAP_WEEKS = 16;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type DayState = 'completed' | 'partial' | 'none' | 'future';

type HeatmapProps = {
  history: StreakHistoryEntry[];
};

function buildGrid(history: StreakHistoryEntry[]) {
  const completedByDate = new Map<string, boolean>();
  for (const entry of history) {
    completedByDate.set(entry.date, entry.dayCompleted);
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = new Date(startOfToday);
  weekStart.setDate(startOfToday.getDate() - startOfToday.getDay());
  const gridStart = new Date(weekStart);
  gridStart.setDate(weekStart.getDate() - (HEATMAP_WEEKS - 1) * 7);

  const months: (string | null)[] = [];
  let prevMonth: number | null = null;
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const first = new Date(gridStart);
    first.setDate(gridStart.getDate() + w * 7);
    const month = first.getMonth();
    months.push(prevMonth === null || month !== prevMonth ? MONTH_LABELS[month] : null);
    prevMonth = month;
  }

  const days: { state: DayState; today: boolean }[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const week: { state: DayState; today: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const key = toDateString(date);
      const isToday = key === toDateString(startOfToday);
      let state: DayState = 'none';
      if (date > startOfToday) {
        state = 'future';
      } else if (completedByDate.has(key)) {
        state = completedByDate.get(key) ? 'completed' : 'partial';
      }
      week.push({ state, today: isToday });
    }
    days.push(week);
  }

  return { months, days };
}

export function Heatmap({ history }: HeatmapProps) {
  const theme = useTheme();
  const { months, days } = buildGrid(history);

  function cellColor(state: DayState): string {
    switch (state) {
      case 'completed':
        return theme.success;
      case 'partial':
        return theme.successSoft;
      case 'future':
        return theme.backgroundElement;
      case 'none':
        return theme.backgroundSelected;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <View style={[styles.labelSpacer, styles.cell]} />
        {months.map((month, index) => (
          <View key={index} style={[styles.column, styles.monthCell]}>
            {month ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.monthLabel}>
                {month}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>

      {Array.from({ length: 7 }, (_, d) => (
        <View key={d} style={styles.row}>
          <View style={[styles.labelSpacer, styles.cell]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dayLabel}>
              {DAY_LABELS[d]}
            </ThemedText>
          </View>
          {days.map((week, w) => {
            const day = week[d];
            return (
              <View
                key={w}
                style={[
                  styles.cell,
                  {
                    backgroundColor: cellColor(day.state),
                    borderColor: day.today ? theme.tint : 'transparent',
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: CELL_GAP,
  },
  monthRow: {
    flexDirection: 'row',
    height: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelSpacer: {
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  monthCell: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
  },
  monthLabel: {
    fontSize: 10,
    lineHeight: 14,
  },
  dayLabel: {
    fontSize: 10,
    lineHeight: 14,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: CELL_GAP,
    marginBottom: CELL_GAP,
  },
});
