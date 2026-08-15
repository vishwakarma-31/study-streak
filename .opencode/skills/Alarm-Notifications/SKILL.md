# Skill: Alarm Notifications

Read this before implementing Phase 18. Plain `expo-notifications` cannot loop a sound for several minutes — it fires once, briefly. A real ringing-alarm experience needs `notifee`, which supports full-screen alarm-style notifications with a looping sound and action buttons.

## Library

Use `@notifee/react-native` (notifee). This requires a custom dev client / EAS build (already the case for this project — not compatible with plain Expo Go, which is already a non-issue here since the app ships as an installed APK).

```bash
npx expo install @notifee/react-native
```

Notifee provides its own Expo config plugin for the required native permissions — add it to `app.json`'s plugins array.

## Required Android Permissions

- `SCHEDULE_EXACT_ALARM` (Android 12+) — needed for the alarm to fire at the precise scheduled time, not a batched/delayed window
- `USE_FULL_SCREEN_INTENT` (Android 14+ requires the user to manually grant this in system settings — surface an explainer in-app, similar to the battery-optimization prompt from the earlier audit phase)
- `POST_NOTIFICATIONS` (Android 13+) — already required for existing notifications
- `WAKE_LOCK` — needed to keep the device awake while the alarm sound plays

## Per-Reminder Setting (confirmed: per-reminder, not global)

Each of the existing scheduled reminders (see `skills/notification-scheduling.md` for the full weekday/Saturday/Sunday list) gets its own independent mode, not one global switch.

### Data Model Addition

`notificationPreferences` (per user):
```
{
  weekday: {
    wake:          { mode: "notification" | "alarm", alarmDurationMinutes?: 3 | 5 | 10 },
    session1Start: { mode, alarmDurationMinutes? },
    session2Start: { mode, alarmDurationMinutes? },
    logReminder:   { mode, alarmDurationMinutes? }
  },
  saturday: { wake: {...}, dsaBlock: {...}, logReminder: {...} },
  sunday:   { wake: {...}, planReminder: {...} }
}
```

Default every reminder to `mode: "notification"` — alarm mode is opt-in per reminder, not the default, since not every reminder needs to be jarring (the 8 pm evening block reminder, for instance, doesn't need a blaring alarm the way the 4 am wake-up does).

## Alarm Behavior

- Duration options: 3, 5, or 10 minutes, chosen per-reminder in Settings
- Full-screen notification (wakes the screen, shows over the lock screen) with the sound looping for the chosen duration or until dismissed, whichever comes first
- **Stop** and **Snooze** (5 min) action buttons on the alarm notification
- If dismissed or timed out without being stopped, fall back to a normal persistent notification so it's still visible in the notification shade afterward

## Settings Screen

Add a per-reminder row: toggle between Notification / Alarm, and if Alarm, a duration picker (3/5/10 min). Changing a setting should reschedule that specific reminder without affecting the others (reuse the cancel-and-reschedule pattern already established in `skills/notification-scheduling.md` — don't stack duplicates).

## Honest Caveat to Communicate to the User

Even with proper alarm scheduling, Android OEM battery management (see the earlier Phase 16 audit) can still interfere unless the app is exempted. Alarms fare meaningfully better than plain notifications because they use the same OS pathway as the device's built-in alarm clock, but they aren't 100% immune. Keep the battery-optimization onboarding prompt from Phase 16 in place — it's still relevant here, not superseded by this feature.