# Skill: Streak Logic

Read this before touching anything in `services/streakCalculator.js`, the `dailyLogs` route, or the cron job. Getting this wrong silently breaks the entire point of the app.

## The Rule

A day counts as complete when `sessionsCompletedCount >= 3` (out of 4 tracked blocks for that day — see the `dailyBlocks` config for weekday/Saturday/Sunday definitions).

## Core Algorithm

```
On receiving a dailyLog sync for date D:
  sessionsCompletedCount = count(true in sessionsCompleted)
  dayCompleted = sessionsCompletedCount >= 3

  if dayCompleted:
    if lastCompletedDate == D - 1 day:
        currentStreak += 1
    else if lastCompletedDate == D:
        // already counted today — no change, this is a re-sync, not a new day
    else:
        currentStreak = 1   // gap detected — streak restarts fresh
    lastCompletedDate = D
    longestStreak = max(longestStreak, currentStreak)
    totalDaysCompleted += 1
```

## The Midnight Cron (the part that's easy to forget)

The above only fires when a sync happens. If she simply never opens the app on a given day, nothing syncs — so nothing resets the streak on its own. A daily cron job at midnight (server time) must check: for yesterday's date, does a `dailyLog` exist with `dayCompleted: true`? If not, and `currentStreak > 0`, reset it to 0.

Without this cron, the streak would only break on the *next* time she opens the app and logs a completed day — which could be days later and would incorrectly bridge the gap.

## Edge Cases to Test

1. **Consecutive completed days** → streak increments correctly each day.
2. **A gap day (missed entirely)** → cron resets streak to 0 at midnight; next completed day starts a fresh streak of 1.
3. **Same-day duplicate sync** (she checks a box, it syncs, she checks another box later same day, it syncs again) → must not double-increment the streak. Compare `lastCompletedDate == D` before incrementing.
4. **Exactly 3 of 4 blocks** → counts as completed.
5. **Exactly 2 of 4 blocks** → does NOT count as completed, even though she did something that day.
6. **Retroactive sync** (she was offline, logs sync hours later but still same calendar date) → should behave identically to a same-day sync, not treated as a gap.
7. **Timezone handling** — normalize `date` to the user's local calendar day, not UTC, or a session done at 11:50pm could get misfiled into the wrong day. Store the date as a plain `YYYY-MM-DD` string computed from local time at the point of check-in, not a UTC timestamp that gets reinterpreted later.

## Why Server-Side, Not Client-Side

The client can display the streak, but must never be the source of truth for it. If the calculation lived on the device, changing the phone's clock (accidentally or not) or reinstalling the app could fake or dodge a broken streak. The whole value of "strict" mode depends on this being tamper-proof.