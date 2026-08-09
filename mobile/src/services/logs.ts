import AsyncStorage from '@react-native-async-storage/async-storage';

import { submitLog } from './api';
import { getJson, setJson } from './storage';

const LOG_CACHE_KEY = 'local_logs';
const PENDING_PREFIX = 'pending_sync:';

export const EMPTY_SESSIONS: boolean[] = [false, false, false, false];

export async function getLocalLog(date: string): Promise<boolean[]> {
  const map = await getJson<Record<string, boolean[]>>(LOG_CACHE_KEY);
  return map?.[date] ?? [...EMPTY_SESSIONS];
}

export async function setLocalLog(date: string, sessionsCompleted: boolean[]): Promise<void> {
  const map = (await getJson<Record<string, boolean[]>>(LOG_CACHE_KEY)) ?? {};
  map[date] = sessionsCompleted;
  await setJson(LOG_CACHE_KEY, map);
  await setJson(`${PENDING_PREFIX}${date}`, sessionsCompleted);
}

export async function isPending(date: string): Promise<boolean> {
  return (await AsyncStorage.getItem(`${PENDING_PREFIX}${date}`)) !== null;
}

export async function getPendingDates(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((key) => key.startsWith(PENDING_PREFIX))
    .map((key) => key.slice(PENDING_PREFIX.length));
}

export async function flushPendingSync(): Promise<{
  syncedDates: string[];
  serverLogs: Record<string, boolean[]>;
}> {
  const dates = await getPendingDates();
  const syncedDates: string[] = [];
  const serverLogs: Record<string, boolean[]> = {};

  for (const date of dates) {
    try {
      const queued = await getJson<boolean[]>(`${PENDING_PREFIX}${date}`);
      if (!queued) continue;

      const res = await submitLog(date, queued);

      const current = await getJson<boolean[]>(`${PENDING_PREFIX}${date}`);
      if (current && JSON.stringify(current) === JSON.stringify(queued)) {
        await AsyncStorage.removeItem(`${PENDING_PREFIX}${date}`);
        const map = (await getJson<Record<string, boolean[]>>(LOG_CACHE_KEY)) ?? {};
        map[date] = res.log.sessionsCompleted;
        await setJson(LOG_CACHE_KEY, map);
        syncedDates.push(date);
        serverLogs[date] = res.log.sessionsCompleted;
      }
    } catch {
      // keep queued; retry on the next flush
    }
  }

  return { syncedDates, serverLogs };
}
