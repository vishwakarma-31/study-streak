# AGENTS.md — Study Streak App

This file is the persistent context for any agent (OpenCode) working on this project. Read this in full before starting any session. Update `progress.md` and `decisions.md` as instructed below — do not skip this.

---

## 1. What This Project Is

A companion mobile app for a single user, built to enforce accountability to a pre-defined full-stack study roadmap through a **strict, server-verified streak system**. Not a general habit tracker — the roadmap, daily blocks, and notification schedule are all fixed and specific to this one user's plan.

**Non-negotiable design principles — do not violate these even if a shortcut seems easier:**
1. The streak count is calculated and stored **server-side**, never trusted from client state. Client can display it, never compute the authoritative value.
2. A day counts as "completed" when **at least 3 of the day's 4 blocks** are checked off. This threshold is fixed — do not make it configurable without explicit human instruction.
3. No dark-pattern UX. No guilt-based copy ("You'll lose your streak!"), no fake urgency, no manipulative notification cadence. Reminders state facts ("Session 2 starts now"), never pressure.
4. The app must work offline for check-ins (AsyncStorage first, sync when online). The user may be checking off a 4 am session before her phone has signal.

---

## 2. Tech Stack (do not deviate without updating decisions.md)

| Layer | Choice |
|---|---|
| Mobile | React Native via Expo (managed workflow) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt, single user account, no roles/RBAC needed |
| Local cache | AsyncStorage |
| Notifications | expo-notifications (local scheduling, no push server) |
| Backend hosting | Render or Railway |
| Mobile builds | Expo EAS Build → installable APK |

---

## 3. Repo Structure

```
study-streak-app/
├── backend/
│   ├── src/
│   │   ├── models/         # User, DailyLog, StreakState, Badge, Roadmap
│   │   ├── routes/         # auth, roadmap, logs, streak, badges
│   │   ├── controllers/
│   │   ├── middleware/      # auth (JWT verify), error handler
│   │   ├── services/        # streakCalculator.js — the core logic, keep isolated + unit tested
│   │   ├── cron/             # midnight streak-reset job
│   │   └── seed/             # roadmap seed data (from the study plan)
│   ├── .env.example
│   └── package.json
├── mobile/
│   ├── App.js
│   ├── screens/              # Onboarding, Today, Progress, Roadmap, History, Settings
│   ├── components/
│   ├── services/              # api.js (axios), storage.js (AsyncStorage), notifications.js
│   ├── navigation/
│   └── app.json / eas.json
├── AGENTS.md                  # this file
├── progress.md
├── decisions.md
└── skills/                    # domain reference docs, read before touching that domain
```

---

## 4. How to Work Across Sessions

1. **Start of every session:** read `AGENTS.md` (this file), then `progress.md` to see what phase is active and what's already done, then `decisions.md` to see prior decisions and avoid re-litigating them.
2. **Before touching a specific domain** (streak logic, notifications, offline sync, API design, mobile UI), read the matching file in `skills/` first. These encode hard-won constraints that aren't obvious from the spec alone.
3. **End of every session:** update `progress.md` — check off completed subtasks, add notes on anything half-done or blocked. If a meaningful technical choice was made (a library picked, a schema changed, an approach abandoned), log it in `decisions.md` with a one-line rationale.
4. **Phase 9 (device testing) and Phase 10 (build & deploy) require explicit human confirmation before proceeding.** Do not run `eas build` or deploy the backend without the human explicitly saying to proceed. This matches the same safeguard used on the Dark Pattern Detector project.

---

## 5. Environment Variables (backend/.env)

```
MONGO_URI=
JWT_SECRET=
PORT=5000
NODE_ENV=development
```

## 6. Testing Expectations

- `services/streakCalculator.js` needs unit tests covering: consecutive days, a gap day, same-day duplicate sync, exactly-3-of-4 threshold, exactly-2-of-4 (should not complete), midnight cron reset when no log exists.
- API endpoints should have at least a happy-path integration test each before being marked done in `progress.md`.

## 7. Reference

Full architecture and data model spec: see `study-streak-app-spec.md` (provided separately, keep it alongside this repo — it's the source of truth for schemas and endpoint contracts).