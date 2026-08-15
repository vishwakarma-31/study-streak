# Loop Goal — Phase 18 (Alarm Notifications) + Phase 19 (Custom Task-of-the-Day + Provisional Streak)

## Status check first
Verified against the live repo — neither phase has any code yet:
- `notifee` is not in `mobile/package.json`.
- No custom-task model or field exists anywhere in the backend. `DailyLog`'s schema is exactly `sessionsCompleted[4]`, `sessionsCompletedCount`, `dayCompleted`, `note`, `dsaProblems[]`, `syncedAt` — no generic task field.
- `streakCalculator.js` is still the Phase-10 "authoritative overwrite + full recompute" version (`computeStreakFromLogs`) — no `confirmedStreak` / `todayCounted` split.
- `services/notifications.ts` is still the lazy-loaded `expo-notifications` module from Phase 9 — fine for the existing fixed schedule, this is what Phase 18 extends, not replaces.

Pick up from here. Both phases as originally planned, adjusted only to note they build on the current codebase (Ledger visuals + Ascend name already in place).

---

## Phase 18 — Alarm-style reminders

### Objective
Some reminders need to actually *ring* — loop sound, ignore silent mode, wake the screen — not just post a silent banner. `expo-notifications` can't loop sound or reliably bypass silent/DND; that needs a native alarm module.

### Non-negotiables
- **No dark patterns** — an alarm is a stronger interruption than a notification, so this needs *more* restraint on copy/behavior, not less. No shame copy on dismiss, no re-triggering to guilt a snooze.
- Must degrade gracefully in Expo Go exactly like `expo-notifications` already does (lazy `require()`, guarded, no-op if the native module isn't available). `notifee` needs its own guard — it isn't covered by the existing one.
- **Per-reminder choice, not global**: each scheduled reminder needs a mode — plain notification vs. ringing alarm — configurable in Settings, not hardcoded per time slot. Confirm with the human which specific reminders (the 4:00/4:15 am ones are the obvious candidates) should default to alarm mode before assuming.

### Scope
1. Add `@notifee/react-native`. This requires a custom dev client (EAS `development` build profile) since it's a native module — Expo Go cannot run it. Flag this to the human before building; it changes the device-testing loop from Phase 9 (alarms can't be verified in plain Expo Go).
2. Extend `services/notifications.ts`'s schedule model: each `ReminderEntry` gains `mode: 'notification' | 'alarm'`. Alarm-mode entries schedule through notifee's trigger notification with a full-screen intent + looping sound category (Android) instead of `expo-notifications`.
3. Settings screen: per-reminder toggle list, extending the existing Phase 5 reminders-toggle pattern from a single on/off to a per-entry list.
4. Snooze/dismiss actions on the alarm notification (notifee action buttons), factual copy only ("Dismiss", "Snooze 5 min").

### Definition of done
- [ ] `notifee` wired, guarded against Expo Go crashes the same way `expo-notifications` is.
- [ ] The agreed alarm-mode reminders ring as real alarms on a dev-client build, verified on-device — explicit human confirmation required, same gate as Phase 9/10.
- [ ] Per-reminder mode is user-configurable in Settings.
- [ ] `decisions.md` row: which reminders got alarm mode and why; notifee vs. alternatives considered.
- [ ] `progress.md` Phase 18 block added and checked off.

---

## Phase 19 — Custom task-of-the-day + provisional streak

### Objective
Let the human add one extra task to *today only* (no backdating — every other day's roadmap blocks stay the sole source of truth). If added after today was already marked complete, the streak should visibly tick back down until the custom task is also done. This is a real algorithm change, not just a UI addition — the streak's invariant ("dayCompleted from ≥3/4 fixed blocks") now has to account for a 5th, dynamic item.

### Non-negotiables
- Streak stays server-computed and tamper-proof — provisional state can be computed and shown client-side, but the authoritative value stays server-side.
- RP (`RankState.totalRP`) still **never decreases** (the ranking-system rule) — this is the hard part, since a day flipping complete→incomplete must not claw back RP already awarded. Needs an explicit finalization boundary.

### Design direction (confirm before implementing)
- `StreakState` gains `confirmedStreak` (frozen at midnight finalization, like today's `currentStreak`) plus a derived, **not stored**, live "today provisional" value the API computes from `confirmedStreak` + whether today (including any custom task) currently satisfies completion.
- `DailyLog` gains an optional `customTask: { title: String, completed: Boolean } | null`, settable only where `date === today` — reject writes for any other date server-side (enforces "no backdating").
- `dayCompleted` for a day with a `customTask` requires **both** the existing ≥3/4-blocks rule **and** `customTask.completed`. No custom task on a day = unchanged behavior.
- RP awarding moves from "on every `POST /logs/:date` that flips false→true" (current Phase-11 behavior) to **midnight cron finalization only**: RP for a day is awarded once, at the cron boundary, based on that day's final `dayCompleted` state. An intra-day flip-back-and-forth (complete → add custom task → streak dips → complete task → streak recovers) never touches RP until the day is actually over — this is what protects "RP never decreases" under the provisional model.
- `GET /streak` gains `todayProvisional: boolean` so the Today screen can show "streak would drop to N" factually, without guilt copy.

### Scope
1. Backend: `DailyLog.customTask` field, `PATCH /logs/:date/custom-task` (today-only, 400 on any other date), `computeStreakFromLogs` extended for custom-task completion, cron job extended to award/finalize RP at midnight, `applyDayCompletion` call site moved from `upsertLog` to the cron.
2. Mobile: "Add a task for today" affordance below the 4 fixed blocks (visually distinct, not styled as a 5th roadmap block), provisional-streak messaging, offline-queue extension (same `pending_sync:<date>` pattern, new key for the custom task).
3. Unit tests: streak calculator with custom task present/absent/completed/incomplete; RP finalization timing (mid-day flips don't touch RP, midnight does); `PATCH` rejects non-today dates.

### Definition of done
- [ ] All of the above implemented and unit-tested (extend `streakCalculator.test.js`, `rankCalculator.test.js`, add cron finalization tests).
- [ ] `decisions.md`: log the RP-timing-move decision explicitly — the biggest behavioral change since Phase 10's authoritative-overwrite fix.
- [ ] `progress.md` Phase 19 block, checked off.
- [ ] Explicit human confirmation before this ships to the deployed backend — it changes when/how RP is awarded on live user data, exactly the kind of change the Phase 9/10 human-gate exists for.

## Skills / reference docs needed
- **Existing, reuse:** `skills/streak-logic.md`, `skills/ranking-system.md`. Amend both with a short addendum on the provisional-streak / finalization-timing model rather than writing new files.
- No new skill file needed for this loop.