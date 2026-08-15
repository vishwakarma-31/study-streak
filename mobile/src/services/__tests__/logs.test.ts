import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createCustomTask,
  deleteCustomTask,
  fetchCustomTasks,
  submitLog,
  updateCustomTask,
  type CustomTask,
  type SubmitLogResponse,
} from '../api';
import {
  EMPTY_SESSIONS,
  addLocalCustomTask,
  deleteLocalCustomTask,
  flushPendingCustomTasks,
  flushPendingSync,
  getLocalCustomTasks,
  getLocalLog,
  getPendingCustomTaskDates,
  getPendingDates,
  isCustomTaskPending,
  isPending,
  setLocalLog,
  setServerCustomTasks,
  toggleLocalCustomTask,
} from '../logs';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../api', () => ({
  createCustomTask: jest.fn(),
  deleteCustomTask: jest.fn(),
  fetchCustomTasks: jest.fn(),
  submitLog: jest.fn(),
  updateCustomTask: jest.fn(),
}));

const mockedSubmitLog = submitLog as jest.MockedFunction<typeof submitLog>;
const mockedFetchCustomTasks = fetchCustomTasks as jest.MockedFunction<typeof fetchCustomTasks>;
const mockedCreateCustomTask = createCustomTask as jest.MockedFunction<typeof createCustomTask>;
const mockedUpdateCustomTask = updateCustomTask as jest.MockedFunction<typeof updateCustomTask>;
const mockedDeleteCustomTask = deleteCustomTask as jest.MockedFunction<typeof deleteCustomTask>;

function makeSubmitResponse(sessionsCompleted: boolean[]): SubmitLogResponse {
  return {
    log: { sessionsCompleted },
    streak: {
      currentStreak: 1,
      confirmedStreak: 1,
      todayProvisional: false,
      longestStreak: 1,
      lastCompletedDate: '2026-08-09',
      totalDaysCompleted: 1,
      history: [],
    },
  };
}

function makeTask(partial: Partial<CustomTask> & { id: string }): CustomTask {
  return { title: 'task', completed: false, date: '2026-08-09', ...partial };
}

describe('logs offline queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('defaults to an empty session for an unknown date', async () => {
    await expect(getLocalLog('2026-08-09')).resolves.toEqual(EMPTY_SESSIONS);
  });

  it('setLocalLog writes the cache and enqueues the date as pending', async () => {
    await setLocalLog('2026-08-09', [true, false, false, false]);

    await expect(getLocalLog('2026-08-09')).resolves.toEqual([true, false, false, false]);
    await expect(isPending('2026-08-09')).resolves.toBe(true);
    await expect(getPendingDates()).resolves.toEqual(['2026-08-09']);
  });

  it('flush posts pending dates, clears the queue, and mirrors the server log', async () => {
    const serverLog = [true, true, false, false];
    mockedSubmitLog.mockResolvedValueOnce(makeSubmitResponse(serverLog));

    await setLocalLog('2026-08-09', [true, false, false, false]);

    const result = await flushPendingSync();

    expect(mockedSubmitLog).toHaveBeenCalledWith('2026-08-09', [true, false, false, false]);
    expect(result.syncedDates).toEqual(['2026-08-09']);
    expect(result.serverLogs['2026-08-09']).toEqual(serverLog);
    await expect(isPending('2026-08-09')).resolves.toBe(false);
    await expect(getLocalLog('2026-08-09')).resolves.toEqual(serverLog);
  });

  it('server-merged value wins over the locally queued value', async () => {
    const serverLog = [true, true, false, false];
    mockedSubmitLog.mockResolvedValueOnce(makeSubmitResponse(serverLog));

    await setLocalLog('2026-08-09', [true, false, false, false]);
    await flushPendingSync();

    await expect(getLocalLog('2026-08-09')).resolves.toEqual(serverLog);
  });

  it('keeps the date queued when the POST fails', async () => {
    mockedSubmitLog.mockRejectedValueOnce(new Error('network down'));

    await setLocalLog('2026-08-09', [true, false, false, false]);
    const result = await flushPendingSync();

    expect(result.syncedDates).toEqual([]);
    await expect(isPending('2026-08-09')).resolves.toBe(true);
    await expect(getLocalLog('2026-08-09')).resolves.toEqual([true, false, false, false]);
  });

  it('does not lose a check-in that lands mid-flush', async () => {
    mockedSubmitLog.mockImplementationOnce(async (date) => {
      const edited = [true, false, false, true];
      await AsyncStorage.setItem(`pending_sync:${date}`, JSON.stringify(edited));
      return makeSubmitResponse([true, false, false, false]);
    });

    await setLocalLog('2026-08-09', [true, false, false, false]);
    const result = await flushPendingSync();

    expect(result.syncedDates).not.toContain('2026-08-09');
    await expect(isPending('2026-08-09')).resolves.toBe(true);
    await expect(getLocalLog('2026-08-09')).resolves.toEqual([true, false, false, false]);
  });

  it('flushes multiple pending dates in one pass', async () => {
    mockedSubmitLog.mockImplementation(async (date) =>
      makeSubmitResponse([false, false, false, false])
    );

    await setLocalLog('2026-08-08', [true, false, false, false]);
    await setLocalLog('2026-08-09', [true, true, false, false]);
    const result = await flushPendingSync();

    expect(result.syncedDates.sort()).toEqual(['2026-08-08', '2026-08-09']);
    await expect(isPending('2026-08-08')).resolves.toBe(false);
    await expect(isPending('2026-08-09')).resolves.toBe(false);
  });
});

describe('custom task offline queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('defaults to an empty list for an unknown date', async () => {
    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([]);
  });

  it('adds a task locally with a temp id and marks the date pending', async () => {
    const task = await addLocalCustomTask('2026-08-09', 'Revise notes');

    expect(task.id.startsWith('local-')).toBe(true);
    expect(task.completed).toBe(false);
    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([task]);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(true);
    await expect(getPendingCustomTaskDates()).resolves.toEqual(['2026-08-09']);
  });

  it('toggles and deletes tasks locally', async () => {
    const task = await addLocalCustomTask('2026-08-09', 'Revise notes');
    await toggleLocalCustomTask('2026-08-09', task.id, true);
    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([{ ...task, completed: true }]);

    await deleteLocalCustomTask('2026-08-09', task.id);
    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([]);
  });

  it('adopts the server list without marking pending', async () => {
    await setServerCustomTasks('2026-08-09', [makeTask({ id: 'a1' })]);

    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([
      { id: 'a1', title: 'task', completed: false },
    ]);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(false);
  });

  it('flush creates offline tasks, patches completion, and clears pending', async () => {
    mockedFetchCustomTasks.mockResolvedValue([]);
    mockedCreateCustomTask.mockResolvedValueOnce(makeTask({ id: 's1', title: 'Offline task' }));

    const local = await addLocalCustomTask('2026-08-09', 'Offline task');
    await toggleLocalCustomTask('2026-08-09', local.id, true);

    const result = await flushPendingCustomTasks();

    expect(mockedCreateCustomTask).toHaveBeenCalledWith('2026-08-09', 'Offline task');
    expect(mockedUpdateCustomTask).toHaveBeenCalledWith('s1', true);
    expect(result.syncedDates).toEqual(['2026-08-09']);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(false);
    await expect(getLocalCustomTasks('2026-08-09')).resolves.toEqual([
      { id: 's1', title: 'Offline task', completed: true },
    ]);
  });

  it('flush patches differing server tasks and deletes removed ones', async () => {
    mockedFetchCustomTasks.mockResolvedValue([
      makeTask({ id: 's1', completed: false }),
      makeTask({ id: 's2', completed: true }),
    ]);

    await setServerCustomTasks('2026-08-09', [
      makeTask({ id: 's1', completed: false }),
      makeTask({ id: 's2', completed: true }),
    ]);
    await toggleLocalCustomTask('2026-08-09', 's1', true);
    await deleteLocalCustomTask('2026-08-09', 's2');

    const result = await flushPendingCustomTasks();

    expect(mockedUpdateCustomTask).toHaveBeenCalledWith('s1', true);
    expect(mockedDeleteCustomTask).toHaveBeenCalledWith('s2');
    expect(result.syncedDates).toEqual(['2026-08-09']);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(false);
  });

  it('keeps the date pending when a create fails', async () => {
    mockedFetchCustomTasks.mockResolvedValue([]);
    mockedCreateCustomTask.mockRejectedValueOnce(new Error('network down'));

    await addLocalCustomTask('2026-08-09', 'Offline task');
    const result = await flushPendingCustomTasks();

    expect(result.syncedDates).toEqual([]);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(true);
  });

  it('does not lose a task toggle that lands mid-flush', async () => {
    mockedFetchCustomTasks.mockResolvedValue([]);
    const task = await addLocalCustomTask('2026-08-09', 'Offline task');
    mockedCreateCustomTask.mockImplementationOnce(async (date, title) => {
      await toggleLocalCustomTask(date, task.id, true);
      return makeTask({ id: 's1', title });
    });

    const result = await flushPendingCustomTasks();

    expect(result.syncedDates).toEqual([]);
    await expect(isCustomTaskPending('2026-08-09')).resolves.toBe(true);
  });
});
