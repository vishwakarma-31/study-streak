import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createCustomTask,
  deleteCustomTask,
  fetchCustomTasks,
  submitLog,
  updateCustomTask,
  type CustomTask,
} from './api';
import { getJson, setJson } from './storage';

const LOG_CACHE_KEY = 'local_logs';
const PENDING_PREFIX = 'pending_sync:';
const CUSTOM_TASK_CACHE_PREFIX = 'local_custom_tasks:';
const CUSTOM_TASK_PENDING_PREFIX = 'pending_custom:';
const TEMP_ID_PREFIX = 'local-';

export const EMPTY_SESSIONS: boolean[] = [false, false, false, false];

export type LocalCustomTask = {
  id: string;
  title: string;
  completed: boolean;
};

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

export async function getLocalCustomTasks(date: string): Promise<LocalCustomTask[]> {
  return (await getJson<LocalCustomTask[]>(`${CUSTOM_TASK_CACHE_PREFIX}${date}`)) ?? [];
}

async function writeLocalCustomTasks(
  date: string,
  tasks: LocalCustomTask[],
  pending: boolean
): Promise<void> {
  await setJson(`${CUSTOM_TASK_CACHE_PREFIX}${date}`, tasks);
  if (pending) {
    await setJson(`${CUSTOM_TASK_PENDING_PREFIX}${date}`, tasks);
  }
}

// Adopts the authoritative server list (real ids) into the local cache without
// marking the date pending.
export async function setServerCustomTasks(date: string, tasks: CustomTask[]): Promise<void> {
  await writeLocalCustomTasks(
    date,
    tasks.map((t) => ({ id: t.id, title: t.title, completed: t.completed })),
    false
  );
}

export async function addLocalCustomTask(date: string, title: string): Promise<LocalCustomTask> {
  const task: LocalCustomTask = {
    id: `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    completed: false,
  };
  await writeLocalCustomTasks(date, [...(await getLocalCustomTasks(date)), task], true);
  return task;
}

export async function toggleLocalCustomTask(
  date: string,
  id: string,
  completed: boolean
): Promise<void> {
  const tasks = await getLocalCustomTasks(date);
  await writeLocalCustomTasks(
    date,
    tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
    true
  );
}

export async function deleteLocalCustomTask(date: string, id: string): Promise<void> {
  const tasks = await getLocalCustomTasks(date);
  await writeLocalCustomTasks(
    date,
    tasks.filter((t) => t.id !== id),
    true
  );
}

export async function isCustomTaskPending(date: string): Promise<boolean> {
  return (await AsyncStorage.getItem(`${CUSTOM_TASK_PENDING_PREFIX}${date}`)) !== null;
}

export async function getPendingCustomTaskDates(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((key) => key.startsWith(CUSTOM_TASK_PENDING_PREFIX))
    .map((key) => key.slice(CUSTOM_TASK_PENDING_PREFIX.length));
}

// Reconciles the local task list against the server for each pending date:
// create offline-added tasks (patching them when already checked), patch tasks
// whose completion differs, delete server tasks removed locally, then adopt the
// reconciled list under real server ids. The pending marker is only cleared when
// the local list is unchanged since the push started, so a check-in that lands
// mid-flush is retried on the next pass.
export async function flushPendingCustomTasks(): Promise<{ syncedDates: string[] }> {
  const dates = await getPendingCustomTaskDates();
  const syncedDates: string[] = [];

  for (const date of dates) {
    try {
      const queued = await getJson<LocalCustomTask[]>(`${CUSTOM_TASK_PENDING_PREFIX}${date}`);
      if (!queued) continue;

      const serverTasks = await fetchCustomTasks(date);
      const serverById = new Map(serverTasks.map((t) => [t.id, t]));
      const idMap = new Map<string, string>();

      for (const local of queued) {
        if (local.id.startsWith(TEMP_ID_PREFIX)) {
          const created = await createCustomTask(date, local.title);
          idMap.set(local.id, created.id);
          if (local.completed) {
            await updateCustomTask(created.id, true);
          }
        } else if (serverById.has(local.id)) {
          const server = serverById.get(local.id)!;
          if (server.completed !== local.completed) {
            await updateCustomTask(local.id, local.completed);
          }
        }
      }

      const localIds = new Set(queued.map((t) => t.id));
      for (const server of serverTasks) {
        if (!localIds.has(server.id)) {
          await deleteCustomTask(server.id);
        }
      }

      const reconciled = queued.map((t) => {
        const realId = idMap.get(t.id);
        return realId ? { ...t, id: realId } : t;
      });

      const current = await getJson<LocalCustomTask[]>(`${CUSTOM_TASK_PENDING_PREFIX}${date}`);
      if (current && JSON.stringify(current) === JSON.stringify(queued)) {
        await setJson(`${CUSTOM_TASK_CACHE_PREFIX}${date}`, reconciled);
        await AsyncStorage.removeItem(`${CUSTOM_TASK_PENDING_PREFIX}${date}`);
        syncedDates.push(date);
      }
    } catch {
      // keep pending; retry on the next flush
    }
  }

  return { syncedDates };
}
