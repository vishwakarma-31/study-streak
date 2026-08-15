# Skill: Notification Scheduling

Read this before implementing anything in Phase 5 or touching `services/notifications.js`.

## Schedule (local time, matches the actual study routine)

**Weekdays (Mon–Fri):**
- 4:00 am — wake reminder
- 4:15 am — session 1 start
- 8:00 pm — evening block start
- 9:35 pm — "log today before bed" (this is the nudge that actually closes the streak day — don't skip it, it's the one most likely to prevent an accidental missed day)

**Saturday:**
- 4:00 am — wake reminder
- 9:30 am — extended DSA block reminder
- 8:00 pm — "log today" reminder

**Sunday:**
- 4:00 am — wake reminder
- 8:00 pm — "plan next week" reminder

## Implementation Notes

- Use `expo-notifications` with locally scheduled triggers (`Notifications.scheduleNotificationAsync`), not remote push — there's no need for a push server since this is single-device.
- Request notification permissions on first launch (Onboarding screen), handle the case where permission is denied gracefully — the app should still function, just without reminders, and should explain why reminders matter without being pushy about re-requesting permission repeatedly.
- Reschedule all notifications if the day-type changes (e.g. app detects it's now Saturday) — don't hardcode a single repeating schedule that ignores weekday vs weekend.
- If the user changes reminder times in Settings, cancel and reschedule affected notifications rather than stacking duplicates.

## Copy Guidelines (no dark patterns — check every string against this)

**Do:**
- State facts: "Session 2 starts now"
- Give useful context: "3-day streak — log today to keep it going"

**Don't:**
- Use loss-aversion framing: ~~"Don't lose your streak!!"~~
- Use fake urgency: ~~"Last chance today!!"~~
- Guilt-trip on a missed day: ~~"You broke your streak. Are you giving up?"~~ — instead, on a reset streak, the app should say something like "Streak reset. Today's a fresh start." Encouraging, not shaming.
- Spam — 3–4 notifications a day is the ceiling. Do not add "just checking in" filler notifications.