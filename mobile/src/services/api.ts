import { create, isAxiosError, type AxiosError } from 'axios';

import { API_BASE_URL } from './config';
import * as storage from './storage';

const api = create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export function extractApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

export function isNotFound(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 404;
}

// Render's free tier sleeps after ~15 min idle. Warming up on app start/foreground
// absorbs the slow cold-start into this /health call (60s timeout) instead of the
// user's first real request of the day.
export async function warmUpServer(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

export type Block = {
  index: number;
  label: string | null;
  time: string;
};

export type RoadmapResource = {
  name: string;
  platform?: string;
};

export type TodayData = {
  phaseNumber: number;
  phase: string;
  week: number;
  topic: string;
  task: string | null;
  needsContent: boolean;
  blocks: Block[];
  resources: RoadmapResource[];
  dayType: string;
};

export type StreakHistoryEntry = {
  date: string;
  dayCompleted: boolean;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalDaysCompleted: number;
  history: StreakHistoryEntry[];
};

export type SubmitLogResponse = {
  log: { sessionsCompleted: boolean[] };
  streak: StreakData;
};

export type DsaProblem = {
  title: string;
  difficulty: string;
  link?: string;
};

export type DailyLogEntry = {
  date: string;
  sessionsCompletedCount: number;
  dayCompleted: boolean;
  note: string;
  dsaProblems: DsaProblem[];
};

export async function fetchHistory(from?: string, to?: string): Promise<DailyLogEntry[]> {
  const { data } = await api.get<DailyLogEntry[]>('/logs/history', { params: { from, to } });
  return data;
}

export type HistoryDetailBlock = {
  index: number;
  label: string;
  time: string;
  completed: boolean;
};

export type HistoryDetail = {
  date: string;
  dayType: 'weekday' | 'saturday' | 'sunday';
  blocks: HistoryDetailBlock[];
  note: string;
  dsaProblems: DsaProblem[];
};

export async function fetchLog(date: string): Promise<HistoryDetail> {
  const { data } = await api.get<HistoryDetail>(`/logs/${date}`);
  return data;
}

export type BadgeMilestone =
  | '7_day'
  | '30_day'
  | '100_day'
  | 'phase_1_complete'
  | 'phase_2_complete'
  | 'phase_3_complete'
  | 'phase_4_complete'
  | 'phase_5_complete'
  | 'phase_6_complete'
  | 'phase_7_complete'
  | 'phase_8_complete';

export type Badge = {
  milestone: BadgeMilestone;
  achievedDate: string;
};

export async function fetchBadges(): Promise<Badge[]> {
  const { data } = await api.get<Badge[]>('/badges');
  return data;
}

export type RankData = {
  totalRP: number;
  currentTier: string;
  currentSubTier: string | null;
  rpIntoCurrentSubTier: number;
  rpNeededForNextSubTier: number | null;
};

export async function fetchRank(): Promise<RankData> {
  const { data } = await api.get<RankData>('/rank');
  return data;
}

export type RoadmapWeek = {
  weekNumber: number;
  topic: string;
  resources: RoadmapResource[];
  project?: string;
  dsaFocus?: string;
};

export type RoadmapPhase = {
  phaseNumber: number;
  title: string;
  weeks: RoadmapWeek[];
};

export async function fetchRoadmap(): Promise<RoadmapPhase[]> {
  const { data } = await api.get<RoadmapPhase[]>('/roadmap');
  return data;
}

export async function fetchToday(date?: string): Promise<TodayData> {
  const { data } = await api.get<TodayData>('/roadmap/today', { params: { date } });
  return data;
}

export async function fetchStreak(): Promise<StreakData> {
  const { data } = await api.get<StreakData>('/streak');
  return data;
}

export async function submitLog(date: string, sessionsCompleted: boolean[]): Promise<SubmitLogResponse> {
  const { data } = await api.post<SubmitLogResponse>(`/logs/${date}`, { sessionsCompleted });
  return data;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await api.post<{ token: string }>('/auth/login', { email, password });
  return data.token;
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const { data } = await api.post<{ token: string }>('/auth/register', {
    name,
    email,
    password,
  });
  return data.token;
}

export type { AxiosError };

export default api;
