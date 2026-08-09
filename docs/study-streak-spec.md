# Study Streak App — Architecture & Spec

**Purpose:** A companion app for a single user, enforcing accountability to a pre-built full-stack study roadmap through a strict, server-verified streak system. No dark patterns — motivates through clarity and honest progress tracking, not guilt or manufactured urgency.

---

## 1. Design Principles

1. **Server-side truth.** The streak count is never trusted from the device. A user changing their phone's clock or reinstalling the app must not be able to fake or dodge a broken streak.
2. **Strict but fair.** Missing sessions breaks the streak (per user decision), but the completion threshold (3/4 blocks) already builds in a small amount of slack — one missed session in a day doesn't sink it.
3. **No manipulative patterns.** No fake scarcity, no shame-based copy on a broken streak ("You'll lose everything!"), no dopamine-farming push notification spam. Reminders are informative, not guilt trips. (Directly the opposite of what Dark Pattern Detector flags — worth holding this app to the same standard.)
4. **Offline-first for the user, online-verified for the streak.** She can check off sessions without signal (early morning, patchy data); the app syncs and confirms the streak once online.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native (Expo) | Cross-platform (Android + iOS) from one codebase, reliable local notification scheduling |
| Backend | Node.js + Express | Matches existing skillset (Team Task Manager pattern) |
| Database | MongoDB Atlas + Mongoose | Same as Team Task Manager, free tier sufficient for single-user scale |
| Auth | JWT + bcrypt | Reuse existing auth pattern — single user account, no RBAC needed this time |
| Local cache | AsyncStorage | Offline session check-ins, synced on reconnect |
| Notifications | expo-notifications | Locally scheduled, no push server needed since it's single-device |
| Backend hosting | Render or Railway | Same as prior projects |
| App builds | Expo EAS Build | Produces installable APK (Android) directly, no Play Store review needed for personal use; iOS via TestFlight if needed later |

---

## 3. System Architecture

```
[Expo Mobile App]
   ├─ AsyncStorage (offline cache, optimistic UI)
   ├─ expo-notifications (local scheduled reminders)
   └─ REST calls ──────────────► [Express API] ──────────► [MongoDB Atlas]
                                     ├─ /auth
                                     ├─ /roadmap
                                     ├─ /logs
                                     ├─ /streak
                                     └─ /badges
```

Sync flow: app writes today's check-ins to AsyncStorage immediately (instant UI feedback) → queues a sync call → backend recalculates `dayCompleted` and streak state server-side once received → app pulls the authoritative streak value on next successful sync.

---

## 4. Data Models

### `users`
| Field | Type |
|---|---|
| _id | ObjectId |
| name | String |
| email | String |
| passwordHash | String |
| startDate | Date (day 1 of the roadmap, used to compute "today's topic") |
| createdAt | Date |

### `roadmap` (seeded once, read-only reference data — generated from the study plan we built)
| Field | Type |
|---|---|
| phaseNumber | Number (1–8) |
| title | String |
| weeks | Array of `{ weekNumber, topic, resources: [{name, platform}], project, dsaFocus }` |

### `dailyBlocks` (config, not user data — defines the 4 checkable blocks per day type)
| Day type | Block 1 | Block 2 | Block 3 | Block 4 |
|---|---|---|---|---|
| Weekday | Watch/learn (4:15) | Practice (5:05) | Apply/project (8:00) | DSA (Mon/Wed/Fri) or Revision (Tue/Thu) (8:50) |
| Saturday | Project AM (4:15–6) | Project AM cont. (7–9) | Extended DSA (9:30–11) | Project PM (2–4) |
| Sunday | Topic review (4:15) | DSA review (7–8:30) | Bug fixes (2–4) | Weekly planning (8–9) |

### `dailyLogs`
| Field | Type |
|---|---|
| userId | ObjectId |
| date | String (`YYYY-MM-DD`, normalized server-side) |
| sessionsCompleted | `[Boolean, Boolean, Boolean, Boolean]` |
| sessionsCompletedCount | Number (derived) |
| dayCompleted | Boolean (derived: count ≥ 3) |
| note | String (the 1-line daily log) |
| dsaProblems | Array of `{ title, difficulty, link }` (optional, for her own record — not required for streak) |
| syncedAt | Date |

### `streakState`
| Field | Type |
|---|---|
| userId | ObjectId |
| currentStreak | Number |
| longestStreak | Number |
| lastCompletedDate | String |
| totalDaysCompleted | Number |

### `badges`
| Field | Type |
|---|---|
| userId | ObjectId |
| milestone | Enum: `7_day`, `30_day`, `100_day`, `phase_1_complete` … `phase_8_complete` |
| achievedDate | Date |

---

## 5. Streak Logic (server-side, authoritative)

```
On receiving a dailyLog sync for date D:
  sessionsCompletedCount = count(true in sessionsCompleted)
  dayCompleted = sessionsCompletedCount >= 3

  if dayCompleted:
    if lastCompletedDate == D - 1 day:
        currentStreak += 1
    else if lastCompletedDate == D:
        // already counted today, no change
    else:
        currentStreak = 1   // gap detected, streak restarts
    lastCompletedDate = D
    longestStreak = max(longestStreak, currentStreak)
    totalDaysCompleted += 1
  else:
    // day not completed — no streak change yet, but if D has fully
    // passed (checked via a daily cron at midnight) and day wasn't
    // completed, currentStreak resets to 0
```

A daily cron job (midnight server time) checks: if yesterday's `dailyLog` doesn't exist or `dayCompleted` is false, and `currentStreak > 0`, reset `currentStreak` to 0. This catches the case where she simply never opens the app that day.

---

## 6. API Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register` | One-time setup |
| POST | `/auth/login` | Get JWT |
| GET | `/roadmap` | Full 8-phase roadmap |
| GET | `/roadmap/today` | Today's specific topic + resolved day task + 4 blocks, computed from `startDate`; `task` is `null` (and `needsContent: true`) on weekday weeks whose day content isn't authored yet, `null` on weekends |
| GET | `/logs/:date` | Fetch a specific day's log |
| POST | `/logs/:date` | Upsert session check-ins for a date |
| PATCH | `/logs/:date/note` | Add/update the 1-line note |
| GET | `/streak` | Current streak, longest streak, calendar history (for heatmap) |
| GET | `/badges` | Earned milestones |

---

## 7. Screens

1. **Onboarding** (first launch) — shows roadmap overview, sets `startDate`
2. **Today** (home screen) — the day's 4 blocks with real topic names pulled from `/roadmap/today`, checkboxes, streak count shown prominently at top
3. **Streak & Progress** — GitHub-style contribution heatmap, current/longest streak, badges
4. **Roadmap browser** — all 8 phases/weeks, read-only reference
5. **History** — past daily notes and DSA problem log
6. **Settings** — reminder time adjustment, account

---

## 8. Notification Schedule

**Weekdays:** 4:00 am wake · 4:15 am session 1 · 8:00 pm session 2 start · 9:35 pm "log today before bed"
**Saturday:** 4:00 am wake · 9:30 am DSA block · 8:00 pm log reminder
**Sunday:** 4:00 am wake · 8:00 pm "plan next week" reminder

Copy stays factual and encouraging — e.g. "Session 2 starts now" or "3-day streak — log today to keep it going" — never guilt-based ("Don't lose your streak!" is avoided deliberately).

---

## 9. Development Phases

Mirroring the phase-based, agent-driven approach from Dark Pattern Detector:

1. **Backend foundation** — auth, models, roadmap seed data, streak calculation logic + unit tests
2. **API completion** — logs, streak, badges endpoints
3. **Mobile scaffold** — Expo setup, navigation, auth screens
4. **Today screen** — session checklist UI wired to `/roadmap/today`
5. **Notifications** — local scheduling matching weekday/Saturday/Sunday routines
6. **Streak & Progress screen** — heatmap, badges
7. **Roadmap browser screen**
8. **Offline support** — AsyncStorage caching + sync queue
9. **Human-driven test loop** — real-device testing, bug fixes (explicit human check-in before proceeding, same as your other project's Phase 9)
10. **Build & deployment** — EAS build for installable APK, backend deploy (explicit human confirmation before shipping to her phone)

Suggest the same persistent-memory pattern you used before: `AGENTS.md`, `progress.md`, `decisions.md` to keep an agent (OpenCode or similar) on track across sessions.

---

## 10. Open Decisions for Later

- Should DSA problems logged in `dsaProblems` ever surface back into the interview-prep phase (Phase 8 of the study plan) as a searchable list? (Nice-to-have, not MVP.)
- Push notifications currently assume the phone stays on — fine for a single always-on-device use case; revisit only if this ever needs multi-device sync.