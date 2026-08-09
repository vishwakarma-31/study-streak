import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

export const REMINDERS_CHANNEL_ID = 'study-reminders';
export const REMINDERS_CHANNEL_NAME = 'Study reminders';

type NotificationsModule = typeof import('expo-notifications');

// Expo Go on Android removed expo-notifications in SDK 53+, so the module throws
// at import time there. Load it lazily so the app still boots in Expo Go and every
// notification function degrades to a no-op/false instead of crashing.
let notificationsModule: NotificationsModule | null = null;
let moduleLoaded = false;
let handlerInstalled = false;

function getNotifications(): NotificationsModule | null {
  if (!moduleLoaded) {
    moduleLoaded = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      notificationsModule = require('expo-notifications');
    } catch {
      notificationsModule = null;
    }
  }
  if (notificationsModule && !handlerInstalled) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerInstalled = true;
  }
  return notificationsModule;
}

type ReminderTrigger =
  | { type: NotificationsType.SchedulableTriggerInputTypes.DAILY; hour: number; minute: number }
  | {
      type: NotificationsType.SchedulableTriggerInputTypes.WEEKLY;
      weekday: number;
      hour: number;
      minute: number;
    };

type ReminderEntry = {
  title: string;
  body: string;
  trigger: ReminderTrigger;
};

const TITLE = 'Study Streak';

const COPY = {
  wake: 'Wake-up reminder. Session 1 starts at 4:15 am.',
  sessionOne: 'Session 1 starts now.',
  eveningBlock: 'Evening block starts now.',
  logDay: 'Log today\u2019s blocks before the day ends.',
  extendedDsa: 'Extended DSA block starts now.',
  planNextWeek: 'Time to plan next week\u2019s sessions.',
};

const WEEKDAY_IDS = [2, 3, 4, 5, 6];
const SATURDAY_ID = 7;
const SUNDAY_ID = 1;

function buildSchedule(N: NotificationsModule): ReminderEntry[] {
  const entries: ReminderEntry[] = [
    {
      title: TITLE,
      body: COPY.wake,
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 4, minute: 0 },
    },
  ];

  for (const weekday of WEEKDAY_IDS) {
    entries.push(
      {
        title: TITLE,
        body: COPY.sessionOne,
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: 4,
          minute: 15,
        },
      },
      {
        title: TITLE,
        body: COPY.eveningBlock,
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: 20,
          minute: 0,
        },
      },
      {
        title: TITLE,
        body: COPY.logDay,
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: 21,
          minute: 35,
        },
      }
    );
  }

  entries.push(
    {
      title: TITLE,
      body: COPY.extendedDsa,
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: SATURDAY_ID,
        hour: 9,
        minute: 30,
      },
    },
    {
      title: TITLE,
      body: COPY.logDay,
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: SATURDAY_ID,
        hour: 20,
        minute: 0,
      },
    },
    {
      title: TITLE,
      body: COPY.planNextWeek,
      trigger: {
        type: N.SchedulableTriggerInputTypes.WEEKLY,
        weekday: SUNDAY_ID,
        hour: 20,
        minute: 0,
      },
    }
  );

  return entries;
}

export async function getReminderPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  const settings = await N.getPermissionsAsync();
  return settings.granted;
}

export async function requestReminderPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  const settings = await N.requestPermissionsAsync();
  return settings.granted;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  if (!N) return;
  await N.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: REMINDERS_CHANNEL_NAME,
    description: 'Daily session and logging reminders',
    importance: N.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D97706',
  });
}

export async function scheduleReminders(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  await ensureAndroidChannel();
  await N.cancelAllScheduledNotificationsAsync();
  for (const entry of buildSchedule(N)) {
    await N.scheduleNotificationAsync({
      content: { title: entry.title, body: entry.body, sound: 'default' },
      trigger: entry.trigger,
    });
  }
}

export async function cancelReminders(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminderCount(): Promise<number> {
  const N = getNotifications();
  if (!N) return 0;
  const scheduled = await N.getAllScheduledNotificationsAsync();
  return scheduled.length;
}

export async function ensureScheduleExists(): Promise<void> {
  if (!(await getReminderPermission())) return;
  const count = await getScheduledReminderCount();
  if (count === 0) {
    await scheduleReminders();
  }
}

export const REMINDER_SCHEDULE_LINES = [
  'Weekdays: 4:15 am session 1, 8:00 pm evening block, 9:35 pm log',
  'Saturday: 9:30 am extended DSA, 8:00 pm log',
  'Sunday: 8:00 pm plan next week',
] as const;
