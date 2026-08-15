import { Platform } from 'react-native';
import { getJson, setJson } from './storage';
import type { RepeatFrequency as NotifeeRepeatFrequency } from '@notifee/react-native';

export const REMINDERS_CHANNEL_ID = 'study-reminders';
export const REMINDERS_CHANNEL_NAME = 'Study reminders';

export const ALARMS_CHANNEL_ID = 'study-alarms';
export const ALARMS_CHANNEL_NAME = 'Study alarms';

export type ReminderId =
  | 'wake'
  | 'sessionOne'
  | 'eveningBlock'
  | 'logDay'
  | 'extendedDsa'
  | 'planNextWeek';

export type ReminderMode = 'notification' | 'alarm';

export type AlarmDuration = 3 | 5 | 10;

export const ALARM_DURATION_OPTIONS: AlarmDuration[] = [3, 5, 10];
export const DEFAULT_ALARM_DURATION: AlarmDuration = 5;

export type ReminderSetting = {
  enabled: boolean;
  mode: ReminderMode;
  alarmDurationMinutes: AlarmDuration;
};

export type ReminderSettings = Record<ReminderId, ReminderSetting>;

const REMINDER_SETTINGS_KEY = 'reminder_settings';

// Alarm mode is opt-in per reminder; plain notifications are the default so
// non-critical reminders (evening block, logging) aren't jarring.
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  wake: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
  sessionOne: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
  eveningBlock: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
  logDay: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
  extendedDsa: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
  planNextWeek: { enabled: true, mode: 'notification', alarmDurationMinutes: DEFAULT_ALARM_DURATION },
};

function isAlarmDuration(value: unknown): value is AlarmDuration {
  return value === 3 || value === 5 || value === 10;
}

type NotificationsModule = typeof import('expo-notifications');

type NotifeeNamespace = typeof import('@notifee/react-native');
type NotifeeModule = NotifeeNamespace['default'] & {
  AndroidImportance: NotifeeNamespace['AndroidImportance'];
  AndroidCategory: NotifeeNamespace['AndroidCategory'];
  AndroidNotificationSetting: NotifeeNamespace['AndroidNotificationSetting'];
  EventType: NotifeeNamespace['EventType'];
  AlarmType: NotifeeNamespace['AlarmType'];
  RepeatFrequency: NotifeeNamespace['RepeatFrequency'];
  TriggerType: NotifeeNamespace['TriggerType'];
};

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

// Notifee is a native module: it cannot run in Expo Go at all. Guard it the same
// way (lazy require, no-op if unavailable) so alarm-mode reminders degrade to
// plain notifications on non-dev-client builds instead of crashing the app.
let notifeeModule: NotifeeModule | null = null;
let notifeeLoaded = false;
let notifeeHandlersRegistered = false;

const SNOOZE_ACTION = 'snooze';
const DISMISS_ACTION = 'dismiss';
const SNOOZE_MS = 5 * 60 * 1000;

function registerNotifeeHandlers(NF: NotifeeModule): void {
  async function handleAction(event: {
    type: number;
    detail: {
      pressAction?: { id: string };
      notification?: { id?: string; data?: { reminderId?: ReminderId; fallbackId?: string } };
    };
  }): Promise<void> {
    const { type, detail } = event;
    if (type !== NF.EventType.ACTION_PRESS) return;
    const actionId = detail.pressAction?.id;
    const notificationId = detail.notification?.id;
    const reminderId = detail.notification?.data?.reminderId;
    const fallbackId = detail.notification?.data?.fallbackId;

    async function cancelPair(): Promise<void> {
      if (notificationId) {
        await NF.cancelNotification(notificationId);
      }
      if (fallbackId && fallbackId !== notificationId) {
        await NF.cancelNotification(fallbackId);
      }
    }

    if (actionId === DISMISS_ACTION) {
      await cancelPair();
      return;
    }
    if (actionId === SNOOZE_ACTION && reminderId) {
      await cancelPair();
      const entry = buildSchedule().find((item) => item.id === reminderId);
      if (entry) {
        let duration = DEFAULT_ALARM_DURATION;
        try {
          duration = (await getReminderSettings())[reminderId].alarmDurationMinutes;
        } catch {
          // Settings may be unavailable in the headless background handler.
        }
        const snoozeId = `snooze-${entry.id}-${Date.now()}`;
        await scheduleAlarmTrigger(
          NF,
          entry,
          snoozeId,
          fallbackNotificationId(snoozeId),
          Date.now() + SNOOZE_MS,
          duration
        );
      }
    }
  }

  NF.onBackgroundEvent((event) => handleAction(event));
  NF.onForegroundEvent((event) => {
    void handleAction(event);
  });
}

function getNotifee(): NotifeeModule | null {
  if (!notifeeLoaded) {
    notifeeLoaded = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ns = require('@notifee/react-native') as NotifeeNamespace;
      // Methods live on the default export (the ModuleWithStatics instance);
      // the enums are separate named exports. Merge them so callers can use
      // NF.AndroidImportance etc. on the same handle.
      const instance = (ns.default ?? ns) as NotifeeModule;
      notifeeModule = Object.assign(instance, {
        AndroidImportance: ns.AndroidImportance,
        AndroidCategory: ns.AndroidCategory,
        AndroidNotificationSetting: ns.AndroidNotificationSetting,
        EventType: ns.EventType,
        AlarmType: ns.AlarmType,
        RepeatFrequency: ns.RepeatFrequency,
        TriggerType: ns.TriggerType,
      });
    } catch {
      notifeeModule = null;
    }
  }
  if (notifeeModule && !notifeeHandlersRegistered) {
    notifeeHandlersRegistered = true;
    registerNotifeeHandlers(notifeeModule);
  }
  return notifeeModule;
}

// Register notifee's background handler once at startup so snooze/dismiss actions
// work when the app is not in the foreground. Safe to call in Expo Go (no-op).
getNotifee();

type ReminderTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number };

type ReminderEntry = {
  id: ReminderId;
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

function buildSchedule(): ReminderEntry[] {
  const entries: ReminderEntry[] = [
    {
      id: 'wake',
      title: TITLE,
      body: COPY.wake,
      trigger: { kind: 'daily', hour: 4, minute: 0 },
    },
  ];

  for (const weekday of WEEKDAY_IDS) {
    entries.push(
      {
        id: 'sessionOne',
        title: TITLE,
        body: COPY.sessionOne,
        trigger: { kind: 'weekly', weekday, hour: 4, minute: 15 },
      },
      {
        id: 'eveningBlock',
        title: TITLE,
        body: COPY.eveningBlock,
        trigger: { kind: 'weekly', weekday, hour: 20, minute: 0 },
      },
      {
        id: 'logDay',
        title: TITLE,
        body: COPY.logDay,
        trigger: { kind: 'weekly', weekday, hour: 21, minute: 35 },
      }
    );
  }

  entries.push(
    {
      id: 'extendedDsa',
      title: TITLE,
      body: COPY.extendedDsa,
      trigger: { kind: 'weekly', weekday: SATURDAY_ID, hour: 9, minute: 30 },
    },
    {
      id: 'logDay',
      title: TITLE,
      body: COPY.logDay,
      trigger: { kind: 'weekly', weekday: SATURDAY_ID, hour: 20, minute: 0 },
    },
    {
      id: 'planNextWeek',
      title: TITLE,
      body: COPY.planNextWeek,
      trigger: { kind: 'weekly', weekday: SUNDAY_ID, hour: 20, minute: 0 },
    }
  );

  return entries;
}

export const REMINDER_META: { id: ReminderId; label: string; schedule: string }[] = [
  { id: 'wake', label: 'Wake-up reminder', schedule: 'Every day 4:00 am' },
  { id: 'sessionOne', label: 'Session 1', schedule: 'Mon\u2013Fri 4:15 am' },
  { id: 'eveningBlock', label: 'Evening block', schedule: 'Mon\u2013Fri 8:00 pm' },
  { id: 'logDay', label: 'Log today', schedule: 'Mon\u2013Fri 9:35 pm \u00b7 Sat 8:00 pm' },
  { id: 'extendedDsa', label: 'Extended DSA', schedule: 'Sat 9:30 am' },
  { id: 'planNextWeek', label: 'Plan next week', schedule: 'Sun 8:00 pm' },
];

// Next occurrence in local time (epoch ms) for a daily or weekly trigger.
// Weekly weekdays follow the expo-notifications contract: 1=Sun ... 7=Sat.
function nextOccurrenceMs(trigger: ReminderTrigger): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), trigger.hour, trigger.minute, 0, 0);
  if (trigger.kind === 'daily') {
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  }
  const targetDay = trigger.weekday - 1;
  let delta = (targetDay - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + delta);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }
  return next.getTime();
}

function toExpoTrigger(N: NotificationsModule, trigger: ReminderTrigger) {
  if (trigger.kind === 'daily') {
    return {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour: trigger.hour,
      minute: trigger.minute,
    } as const;
  }
  return {
    type: N.SchedulableTriggerInputTypes.WEEKLY,
    weekday: trigger.weekday,
    hour: trigger.hour,
    minute: trigger.minute,
  } as const;
}

function alarmNotificationId(entry: ReminderEntry): string {
  const slot =
    entry.trigger.kind === 'daily'
      ? 'daily'
      : `w${entry.trigger.weekday}-${entry.trigger.hour}${entry.trigger.minute}`;
  return `alarm-${entry.id}-${slot}`;
}

function fallbackNotificationId(alarmId: string): string {
  return `fallback-${alarmId}`;
}

async function ensureNotifeeChannels(NF: NotifeeModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await NF.createChannel({
    id: ALARMS_CHANNEL_ID,
    name: ALARMS_CHANNEL_NAME,
    description: 'Ringing study alarms',
    importance: NF.AndroidImportance.HIGH,
    bypassDnd: true,
    sound: 'default',
    vibration: true,
    vibrationPattern: [0, 400, 200, 400],
  });
  await NF.createChannel({
    id: REMINDERS_CHANNEL_ID,
    name: REMINDERS_CHANNEL_NAME,
    description: 'Daily session and logging reminders',
    importance: NF.AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

// Schedules the full-screen looping alarm plus a companion notification that
// fires when the ringing window ends. If the alarm is dismissed or times out
// without being stopped, the companion keeps a normal notification in the shade.
async function scheduleAlarmTrigger(
  NF: NotifeeModule,
  entry: ReminderEntry,
  alarmId: string,
  fallbackId: string,
  timestamp: number,
  durationMinutes: AlarmDuration,
  repeatFrequency?: NotifeeRepeatFrequency
): Promise<void> {
  const durationMs = durationMinutes * 60 * 1000;

  await NF.createTriggerNotification(
    {
      id: alarmId,
      title: entry.title,
      body: entry.body,
      data: { reminderId: entry.id, fallbackId },
      android: {
        channelId: ALARMS_CHANNEL_ID,
        category: NF.AndroidCategory.ALARM,
        importance: NF.AndroidImportance.HIGH,
        loopSound: true,
        vibrationPattern: [0, 400, 200, 400],
        timeoutAfter: durationMs,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'default' },
        actions: [
          { title: 'Snooze 5 min', pressAction: { id: SNOOZE_ACTION } },
          { title: 'Dismiss', pressAction: { id: DISMISS_ACTION } },
        ],
      },
    },
    {
      type: NF.TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency,
      alarmManager: { type: NF.AlarmType.SET_ALARM_CLOCK },
    }
  );

  await NF.createTriggerNotification(
    {
      id: fallbackId,
      title: entry.title,
      body: entry.body,
      data: { reminderId: entry.id },
      android: {
        channelId: REMINDERS_CHANNEL_ID,
        category: NF.AndroidCategory.REMINDER,
        importance: NF.AndroidImportance.DEFAULT,
        pressAction: { id: 'default' },
        actions: [{ title: 'Snooze 5 min', pressAction: { id: SNOOZE_ACTION } }],
      },
    },
    {
      type: NF.TriggerType.TIMESTAMP,
      timestamp: timestamp + durationMs,
      repeatFrequency,
      alarmManager: { type: NF.AlarmType.SET },
    }
  );
}

async function scheduleAlarm(
  NF: NotifeeModule,
  entry: ReminderEntry,
  durationMinutes: AlarmDuration
): Promise<void> {
  const repeatFrequency: NotifeeRepeatFrequency =
    entry.trigger.kind === 'daily'
      ? NF.RepeatFrequency.DAILY
      : NF.RepeatFrequency.WEEKLY;
  const alarmId = alarmNotificationId(entry);
  await scheduleAlarmTrigger(
    NF,
    entry,
    alarmId,
    fallbackNotificationId(alarmId),
    nextOccurrenceMs(entry.trigger),
    durationMinutes,
    repeatFrequency
  );
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
    lightColor: '#2456A0',
  });
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = await getJson<Partial<ReminderSettings>>(REMINDER_SETTINGS_KEY);
  const settings: ReminderSettings = { ...DEFAULT_REMINDER_SETTINGS };
  if (stored) {
    for (const id of Object.keys(DEFAULT_REMINDER_SETTINGS) as ReminderId[]) {
      const value = stored[id];
      if (value && typeof value.enabled === 'boolean') {
        settings[id] = {
          enabled: value.enabled,
          mode: value.mode === 'alarm' ? 'alarm' : 'notification',
          alarmDurationMinutes: isAlarmDuration(value.alarmDurationMinutes)
            ? value.alarmDurationMinutes
            : DEFAULT_ALARM_DURATION,
        };
      }
    }
  }
  return settings;
}

export async function setReminderSettings(settings: ReminderSettings): Promise<void> {
  await setJson(REMINDER_SETTINGS_KEY, settings);
}

export async function updateReminderSetting(
  id: ReminderId,
  patch: Partial<ReminderSetting>
): Promise<void> {
  const settings = await getReminderSettings();
  settings[id] = { ...settings[id], ...patch };
  await setJson(REMINDER_SETTINGS_KEY, settings);
}

export function isAlarmSupported(): boolean {
  return Platform.OS === 'android' && getNotifee() !== null;
}

export async function scheduleReminders(): Promise<void> {
  const N = getNotifications();
  const NF = getNotifee();
  if (!N && !NF) return;
  if (N) {
    await ensureAndroidChannel();
    await N.cancelAllScheduledNotificationsAsync();
  }
  if (NF) {
    await ensureNotifeeChannels(NF);
    await NF.cancelTriggerNotifications();
  }

  const settings = await getReminderSettings();
  for (const entry of buildSchedule()) {
    const setting = settings[entry.id];
    if (!setting.enabled) continue;
    if (setting.mode === 'alarm') {
      if (NF && Platform.OS === 'android') {
        await scheduleAlarm(NF, entry, setting.alarmDurationMinutes);
      } else if (N) {
        // Degrade gracefully on builds without the notifee native module.
        await N.scheduleNotificationAsync({
          content: { title: entry.title, body: entry.body, sound: 'default' },
          trigger: toExpoTrigger(N, entry.trigger),
        });
      }
    } else if (N) {
      await N.scheduleNotificationAsync({
        content: { title: entry.title, body: entry.body, sound: 'default' },
        trigger: toExpoTrigger(N, entry.trigger),
      });
    }
  }
}

export async function cancelReminders(): Promise<void> {
  const N = getNotifications();
  const NF = getNotifee();
  if (N) {
    await N.cancelAllScheduledNotificationsAsync();
  }
  if (NF) {
    await NF.cancelTriggerNotifications();
    await NF.cancelAllNotifications();
  }
}

export async function getScheduledReminderCount(): Promise<number> {
  const N = getNotifications();
  const NF = getNotifee();
  let count = 0;
  if (N) {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    count += scheduled.length;
  }
  if (NF) {
    const triggers = await NF.getTriggerNotificationIds();
    count += triggers.length;
  }
  return count;
}

export async function getAlarmPermissionState(): Promise<boolean> {
  const NF = getNotifee();
  if (!NF || Platform.OS !== 'android') return true;
  try {
    const settings = await NF.getNotificationSettings();
    return settings.android.alarm !== NF.AndroidNotificationSetting.DISABLED;
  } catch {
    return true;
  }
}

export async function openAlarmPermissionSettings(): Promise<void> {
  const NF = getNotifee();
  if (!NF || Platform.OS !== 'android') return;
  await NF.openAlarmPermissionSettings();
}

export async function ensureScheduleExists(): Promise<void> {
  if (!(await getReminderPermission())) return;
  const count = await getScheduledReminderCount();
  if (count === 0) {
    await scheduleReminders();
  }
}
