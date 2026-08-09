import AsyncStorage from '@react-native-async-storage/async-storage';

import { submitLog, type SubmitLogResponse } from '../api';
import {
  EMPTY_SESSIONS,
  flushPendingSync,
  getLocalLog,
  getPendingDates,
  isPending,
  setLocalLog,
} from '../logs';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../api', () => ({
  submitLog: jest.fn(),
}));

const mockedSubmitLog = submitLog as jest.MockedFunction<typeof submitLog>;

function makeSubmitResponse(sessionsCompleted: boolean[]): SubmitLogResponse {
  return {
    log: { sessionsCompleted },
    streak: {
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: '2026-08-09',
      totalDaysCompleted: 1,
      history: [],
    },
  };
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
