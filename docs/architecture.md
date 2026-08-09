# ARCHITECTURE.md — Study Streak App

Dedicated architecture reference — read this alongside AGENTS.md before starting Phase 1. This covers system structure and data flow; schemas and endpoint contracts live in `study-streak-app-spec.md`.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App (Expo)                        │
│                                                                 │
│  ┌───────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  Screens   │──▶│  Local State │──▶│   AsyncStorage       │  │
│  │ (Today,    │   │  (React      │   │  - today's log       │  │
│  │  Progress, │◀──│   hooks)     │◀──│  - pending sync queue│  │
│  │  Roadmap…) │   └──────────────┘   │  - cached roadmap    │  │
│  └───────────┘                       └─────────────────────┘  │
│         │                                      │                │
│         │                            ┌─────────▼─────────┐     │
│         │                            │  Sync Manager       │     │
│         │                            │  (flushes queue on  │     │
│         │                            │   reconnect/foreground)│  │
│         │                            └─────────┬─────────┘     │
│         │                                      │                │
│  ┌──────▼──────────┐                 ┌─────────▼─────────┐     │
│  │ Notification     │                 │   api.js (axios)   │     │
│  │ Scheduler        │                 │   JWT attached      │     │
│  │ (expo-notif.)    │                 └─────────┬─────────┘     │
│  └──────────────────┘                           │                │
└──────────────────────────────────────────────────┼────────────────┘
                                                    │ HTTPS
                                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)                  │
│                                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Routes    │─▶│ Controllers  │─▶│  streakCalculator.js  │  │
│  │ /auth      │  │              │  │  (isolated, unit-     │  │
│  │ /roadmap   │  │              │  │   tested, the ONE      │  │
│  │ /logs      │  │              │  │   source of streak     │  │
│  │ /streak    │  │              │  │   truth)                │  │
│  │ /badges    │  └──────┬───────┘  └───────────┬───────────┘  │
│  └───────────┘         │                       │                │
│         ▲               ▼                       ▼                │
│  ┌──────┴──────┐  ┌──────────────────────────────────────┐    │
│  │ JWT Auth     │  │        Mongoose Models                │    │
│  │ Middleware   │  │  User, Roadmap, DailyLog, StreakState,│    │
│  └─────────────┘  │  Badge                                 │    │
│                     └──────────────────┬─────────────────┘    │
│  ┌──────────────────────────┐          │                        │
│  │  Midnight Cron Job         │          ▼                        │
│  │  (streak reset check)      │   MongoDB Atlas                  │
│  └──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Responsibilities

| Component | Responsibility | Must NOT do |
|---|---|---|
| Screens | Render UI, dispatch user actions | Contain business logic (no streak math here) |
| Local State (hooks) | Hold in-memory UI state for the current session | Be the source of truth after a sync completes |
| AsyncStorage | Cache today's log, queue pending syncs, cache roadmap for offline browsing | Store the authoritative streak value long-term |
| Sync Manager | Flush the pending queue to the backend on reconnect/foreground | Compute streak values itself |
| Notification Scheduler | Schedule/cancel local notifications per the day-type schedule | Contain any dynamic streak-dependent logic beyond simple copy (e.g. showing current streak number in a reminder is fine; deciding streak state is not) |
| Express Routes/Controllers | Validate input, call services, shape responses | Contain the streak algorithm inline — always delegate to `streakCalculator.js` |
| `streakCalculator.js` | The one and only place streak logic lives | Be duplicated or reimplemented elsewhere |
| Midnight Cron | Catch the "user never opened the app" case | Run more than once a day or double-process a date |
| MongoDB | Persist all authoritative data | — |

---

## 3. Key Data Flows

### 3a. Checking off a session block (the most frequent action)

```
1. User taps a block checkbox on Today screen
2. UI updates instantly (optimistic) — no waiting on network
3. AsyncStorage write: today's log updated locally
4. Change pushed onto the pending-sync queue
5. Sync Manager attempts POST /logs/:date
     ├─ if online: backend upserts DailyLog, recalculates
     │   streak via streakCalculator.js, returns updated
     │   streak → app overwrites displayed streak with
     │   the server value
     └─ if offline: stays queued, retried on next
         reconnect/foreground event
```

### 3b. Opening the app on a new day

```
1. App launches → GET /roadmap/today (computed server-side
   from user.startDate + current date)
2. Today screen renders the real topic/blocks for today
3. GET /streak fetched to show current/longest streak
4. If a cached "yesterday" log still has unsynced items,
   Sync Manager flushes those first
```

### 3c. Midnight cron (the safety net)

```
Every day at 00:00 server time:
1. For yesterday's date, check: does a DailyLog exist
   with dayCompleted: true?
2. If not, and currentStreak > 0 → reset currentStreak to 0
3. This runs independently of whether the user ever
   opens the app — it's the only way a "silent miss"
   (never opening the app that day) still breaks the streak
```

### 3d. Notification firing → app open → check-in loop

```
1. Scheduled local notification fires (e.g. 8:00 pm session start)
2. User taps notification → app opens directly to Today screen
3. Standard check-in flow (3a) proceeds from there
```

---

## 4. Deployment Architecture

```
┌────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  Expo EAS Build │        │  Render/Railway    │        │  MongoDB Atlas    │
│  → APK           │        │  (Express backend) │◀──────▶│  (single cluster,  │
│  → installed      │──────▶│                     │        │   free tier)       │
│    directly on    │  HTTPS│                     │        │                    │
│    her phone       │        │                     │        │                    │
└────────────────┘        └──────────────────┘        └─────────────────┘
```

No app store distribution needed — EAS produces a direct APK for sideloading, since this is single-device, single-user. No push notification server needed either, since all reminders are scheduled locally on-device via expo-notifications.

---

## 5. Why This Shape (quick rationale recap)

- **Business logic centralized server-side** (`streakCalculator.js`) so the streak can never be spoofed from the client — see `skills/streak-logic.md` for the full algorithm.
- **Offline-first on the client, online-authoritative on the server** — she can always check in instantly regardless of signal, but the number she eventually sees is always the backend's calculation, never a local guess.
- **No push infrastructure** — since this is one user on one device, local scheduled notifications are simpler and sufficient; a push server would be unnecessary complexity.