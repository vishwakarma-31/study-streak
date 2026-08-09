import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { BadgeMilestone } from '@/services/api';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type BadgeInfo = {
  milestone: BadgeMilestone;
  label: string;
  description: string;
  icon: IoniconName;
};

export const BADGE_CATALOG: BadgeInfo[] = [
  { milestone: '7_day', label: '7-day streak', description: 'Complete 7 days in a row', icon: 'flame' },
  { milestone: '30_day', label: '30-day streak', description: 'Complete 30 days in a row', icon: 'flame' },
  { milestone: '100_day', label: '100-day streak', description: 'Complete 100 days in a row', icon: 'flame' },
  { milestone: 'phase_1_complete', label: 'Phase 1 complete', description: 'Finish the first phase', icon: 'medal' },
  { milestone: 'phase_2_complete', label: 'Phase 2 complete', description: 'Finish phase 2', icon: 'medal' },
  { milestone: 'phase_3_complete', label: 'Phase 3 complete', description: 'Finish phase 3', icon: 'medal' },
  { milestone: 'phase_4_complete', label: 'Phase 4 complete', description: 'Finish phase 4', icon: 'medal' },
  { milestone: 'phase_5_complete', label: 'Phase 5 complete', description: 'Finish phase 5', icon: 'medal' },
  { milestone: 'phase_6_complete', label: 'Phase 6 complete', description: 'Finish phase 6', icon: 'medal' },
  { milestone: 'phase_7_complete', label: 'Phase 7 complete', description: 'Finish phase 7', icon: 'medal' },
  { milestone: 'phase_8_complete', label: 'Phase 8 complete', description: 'Finish the roadmap', icon: 'medal' },
];
