# progress.md — Study Streak App

Update this file at the end of every session. Check off subtasks as completed. Add a short note under a phase if something is blocked, half-done, or deviated from plan.

**Current active phase:** 10

---

## Phase 1 — Backend Foundation
- [x] Express app scaffold, folder structure per AGENTS.md
- [ ] MongoDB Atlas connection working
- [x] `User` model + register/login routes (JWT + bcrypt)
- [x] `Roadmap` model + seed script (loads the 8-phase study plan as reference data)
- [x] `DailyLog`, `StreakState`, `Badge` models
- [x] `streakCalculator.js` service — core logic isolated, unit tested
- [x] Midnight cron job for streak reset on missed days
- Notes:
  - Scaffold complete: `src/{app,server}.js`, `config/db.js`, routes → controllers split, `middleware/{auth,errorHandler}.js`, all 5 models per spec.
  - `streakCalculator.js` fully implemented per skills/streak-logic.md (gap detection, same-day duplicate, 3-of-4 threshold) + 21 passing unit tests.
  - Midnight cron (`node-cron`, `0 0 * * *`) implemented; `runStreakResetCheck()` exported separately for testability.
  - **Atlas connection NOT verified live** — `backend/.env` still has an empty `MONGO_URI` and empty `JWT_SECRET`. Note: an empty `JWT_SECRET` makes register/login 500 (`secretOrPrivateKey must have a value`). Fill both in before running the server.
  - Roadmap seeded (2026-08-09) with the **real 8-phase plan from `roadmap.md`** — 60 weeks total (P1: 4 wks, P2–P8: 8 wks each). Phase-level resources/project/DSA from the source are attached to every week of the phase; Phase 8 omits `project`/`dsaFocus` (none in the source). `npm run seed` → 8 updated (upsert by phaseNumber).

## Phase 2 — API Completion
- [x] `GET /roadmap`, `GET /roadmap/today`
- [x] `GET /logs/:date`, `POST /logs/:date`, `PATCH /logs/:date/note`
- [x] `GET /streak`
- [x] `GET /badges`
- [x] Auth middleware applied to all protected routes
- [x] Integration tests for each endpoint
- Notes:
  - All endpoints live in `routes/` → `controllers/` per skills/api-design-conventions.md; protected routes use `middleware/auth.js`; only `/auth/register` + `/auth/login` are open.
  - `POST /logs/:date` is a **merging upsert** (true stays true, never overwritten by a stale sync) per skills/offline-first-sync.md; recomputes count/dayCompleted via `streakCalculator`, updates `StreakState`, returns `{ log, streak }`.
  - `GET /roadmap/today` computes phase/week from `user.startDate` + elapsed days, clamps past the roadmap end, and returns day-type-specific 4-block list from `src/config/dailyBlocks.js` (DSA Mon/Wed/Fri, Revision Tue/Thu).
  - `GET /streak` returns `{ currentStreak, longestStreak, lastCompletedDate, totalDaysCompleted, history }` (history = `[{ date, dayCompleted }]` for the heatmap).
  - `GET /badges` returns stored badges only — badge *earning* logic does not exist yet (not in the Phase 2 contract).
  - Integration tests use `mongodb-memory-server` (self-contained, no Atlas credentials needed) — 21 API tests covering every endpoint's happy path + auth-required checks + the upsert-merge case. 42 total tests passing.

## Phase 3 — Mobile Scaffold
- [x] Expo project init, navigation structure set up
- [x] Auth screens (login — single-user, so this can be minimal)
- [x] `api.js` service (axios, JWT attached to headers)
- [x] `storage.js` service (AsyncStorage read/write helpers)
- Notes:
  - Router scaffold: `src/app/_layout.tsx` (AuthProvider + Stack of `login`, `onboarding`, `(tabs)`); `login.tsx` (sign in / create account toggle, calls `useAuth`); `onboarding.tsx` (placeholder preview of the roadmap concept); `(tabs)/` with 5 screens — `index` (Today, fetches `/streak`), `progress`, `roadmap`, `history`, `settings` (sign-out). All protected screens redirect to `/login` when signed out.
  - Services: `services/config.ts` (`API_BASE_URL` + `API_TIMEOUT`), `services/storage.ts` (AsyncStorage token/onboarded helpers), `services/api.ts` (axios instance + auth header interceptor + `login`/`register`/`extractApiError`), `context/auth-context.tsx` (token persistence, `signIn`/`signUp`/`signOut`, `status` machine loading/signedIn/signedOut).
  - Kept template pieces: `components/themed-text|view`, `constants/theme`, `hooks/use-theme`, `hooks/use-color-scheme`. Deleted unused template screens/components (`index`, `explore`, app-tabs, animated-icon, hint-row, web-badge, collapsible kept).
  - **SDK bump during this phase** — package.json was a broken mix of SDK 53 + SDK 57 versions (expo@53 core with expo-router@57, RN 0.72, etc.) so npm couldn't resolve. Aligned everything to Expo SDK 57.0.0 per mobile/AGENTS.md: expo@~57.0.11, RN 0.86.2, react 19.2.3, async-storage 2.2.0, expo-notifications ~57.0.9, reanimated 4.5.1, worklets 0.10.1, added `@expo/vector-icons` (tab icons), eslint-config-expo ~57.0.1. Fixed template lint/type errors (fontWeight strings, `useTheme` 'unspecified' branch, hydration hook). See decisions.md.
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `expo-doctor` 20/20, `expo export` (android) bundles 1321 modules.
  - **Not yet done:** real device preview, actual auth flow against the backend, notification permission (Phase 5), API base URL env wiring for the device (config.ts hardcodes a default).

## Phase 4 — Today Screen
- [x] Fetches `/roadmap/today`, displays real topic + resources
- [x] 4-block checklist UI, writes to AsyncStorage immediately on check
- [x] Sync queue: pending check-ins sync to backend when online
- [x] Streak count displayed prominently
- Notes:
  - `services/api.ts` gained typed fetchers: `fetchToday()`, `fetchStreak()`, `submitLog(date, sessionsCompleted)`, `isNotFound()`, plus `TodayData`/`StreakData`/`Block`/`RoadmapResource`/`SubmitLogResponse` types matching the Phase 2 backend contract.
  - `services/logs.ts` is the offline-first layer: a local log cache (`local_logs`, date → `boolean[4]`) plus a **per-date pending queue** (`pending_sync:<date>` keys — survives app restart), and `flushPendingSync()` which POSTs each queued date to `POST /logs/:date`. A queued entry is only removed if its value is still unchanged after the POST (guards a new check-in landing mid-flush), and the server-merged array is mirrored back into the local cache. The backend's OR-merge upsert is the conflict-safety net per skills/offline-first-sync.md.
  - Today screen (`src/app/(tabs)/index.tsx`): streak (server value from `GET /streak`, cached for offline) large at the top; Phase · Week · weekday label + real topic from `GET /roadmap/today`; four tappable `BlockCard`s toggle instantly (optimistic UI) → write AsyncStorage → enqueue → attempt sync; a subtle muted "Pending sync" label while today is queued (never alarming); streak refreshed from the server after each successful flush; weekly resources listed below the blocks. Roadmap + streak responses are cached (`cache_roadmap_today`, `cache_streak`) so the screen renders offline.
  - Sync triggers: on toggle, on app foreground (AppState), and a 30s interval while the screen is mounted. Immediate network-reconnect detection (NetInfo) is deliberately deferred to Phase 8.
  - New files: `services/date.ts` (local `YYYY-MM-DD` + weekday label), `services/logs.ts`, `components/block-card.tsx`.
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `expo export` (android) bundles.
  - **Not yet done:** live verification against a running backend (still needs Atlas creds + seeded roadmap), real-device preview, and mobile unit tests for the queue/merge logic in `services/logs.ts` (jest-expo isn't configured yet — candidate to add alongside Phase 8).

## Phase 5 — Notifications
- [x] expo-notifications permission flow
- [x] Weekday schedule (4:00, 4:15, 8:00pm, 9:35pm)
- [x] Saturday schedule (4:00, 9:30, 8:00pm)
- [x] Sunday schedule (4:00, 8:00pm)
- [x] Notification copy reviewed against no-dark-pattern principle
- Notes:
  - `services/notifications.ts` is the single scheduling module: module-scope `setNotificationHandler` (banner/list/sound, no badge), `requestReminderPermission()` / `getReminderPermission()`, Android channel `study-reminders` (importance HIGH), `scheduleReminders()` (cancel-all then schedule), `cancelReminders()`, and idempotent `ensureScheduleExists()` (only schedules when permission is granted and zero notifications are scheduled).
  - Schedule uses SDK 57 trigger inputs: one **daily** trigger (4:00 am wake) plus **weekly** triggers per block. Weekly weekday numbering follows the SDK contract (1=Sun … 7=Sat): weekdays 4:15 am / 8:00 pm / 9:35 pm, Sat 9:30 am / 8:00 pm, Sun 8:00 pm. Because weekly triggers encode the day type directly, no reschedule-on-day-change is needed.
  - Copy is factual and pressure-free: "Session 1 starts now.", "Evening block starts now.", "Log today's blocks before the day ends.", "Time to plan next week's sessions." Checked against the skill's copy guidelines — no loss-aversion, no urgency.
  - Permission flow: requested on first launch in `onboarding.tsx` ("Enable reminders" / "Skip for now"); denial is graceful (app fully works, note says reminders can be enabled later). `settings.tsx` has a reminders toggle (on → permission + schedule, off → cancel-all) and shows the schedule summary. Root `_layout.tsx` runs `ensureScheduleExists()` when the user is signed in so a wiped schedule self-heals.
  - `app.json` gained the `expo-notifications` config plugin (`color: #3c87f7`).
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `expo export` (android) bundles.
  - **Not yet done:** real-device confirmation of the permission prompt and actual notification delivery (Phase 9). Reminder times are fixed to the study plan — a time-editor in Settings is intentionally deferred.

## Phase 6 — Streak & Progress Screen
- [x] Contribution heatmap component (calendar view of completed days)
- [x] Current streak / longest streak display
- [x] Badge display (7-day, 30-day, 100-day, phase-complete x8)
- Notes:
  - New `components/heatmap.tsx` — GitHub-style grid: columns are weeks, rows are weekdays (Sun first), weekday letters on the left, month labels above columns when the month changes. Fixed 16-week window ending on the current week. Day states: completed (solid accent `#3c87f7`), logged-but-not-completed (faint accent), no log (neutral), future (dimmer); today gets an accent outline. Built from a continuous date range — the streak `history` only contains logged days, so the grid maps `history` into a date→completed lookup.
  - New `components/badge-card.tsx` + `constants/badges.ts` — static catalog of all 11 badges (7/30/100-day + phase_1..8 complete) with label, description, icon (flame/medal). Per skills/mobile-ui-patterns.md, the grid shows **all** badges — earned ones full-color with achieved date, unearned ones greyed with outline icons ("X of 11 earned" header). The client still trusts the server (`GET /badges`) for which are earned.
  - `services/api.ts` gained `Badge` / `BadgeMilestone` types + `fetchBadges()`. Streak + badges responses cached (`cache_streak`, new `cache_badges`) and loaded cache-first so the screen renders offline; streak 404 (no streak yet) renders zeros calmly, never an error.
  - Cache keys centralized in new `services/cache-keys.ts` (`TODAY_CACHE_KEY`, `STREAK_CACHE_KEY`, `BADGES_CACHE_KEY`); Today screen updated to import them.
  - Progress screen (`src/app/(tabs)/progress.tsx`): heatmap gets the most space, then a three-stat row (current streak / longest streak / days completed), then the badge grid. No dark patterns: reset streak just shows 0, no guilt copy.
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `expo export` (android) bundles.
  - **Not yet done:** badge *earning* still has no backend logic (returns stored badges only — fine for Phase 6 since display works from an empty list); live verification pending Atlas creds + seeded roadmap (Phase 9).

## Phase 7 — Roadmap Browser Screen
- [x] Browse all 8 phases/weeks (read-only)
- [x] Highlight current week based on `startDate`
- Notes:
  - Roadmap screen (`src/app/(tabs)/roadmap.tsx`) fetches `GET /roadmap` (new `fetchRoadmap()` + `RoadmapPhase`/`RoadmapWeek` types in `services/api.ts`) and renders a single scrollable list grouped by phase — phase number pill + title header, then one card per week. Keeps navigation shallow per skills/mobile-ui-patterns.md (read-only reference, no drill-in pages).
  - New `components/week-card.tsx` shows week number, topic, project, DSA focus, and resources per week (matches the `Roadmap` schema contract: `{ weekNumber, topic, resources, project, dsaFocus }`).
  - Current-week highlight: the screen also fetches `GET /roadmap/today` (server computes today's `phaseNumber` + `week` from `user.startDate`) and renders a subtle accent-tinted card with a "Current week" label on the matching week. Position logic stays server-side — the client never computes the week index from `startDate`.
  - Offline: full roadmap + today cached (`cache_roadmap`, `cache_roadmap_today`) and loaded cache-first; if today's position is unavailable (offline with stale cache), the roadmap still browses, just without the highlight.
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `expo export` (android) bundles.
  - **Not yet done:** live verification pending Atlas creds (Phase 9). Roadmap seed data is now live (real plan seeded 2026-08-09).

## Phase 8 — Offline Support
- [ ] Full offline check-in flow tested (airplane mode) — deferred to Phase 9 device loop
- [x] Sync queue retries on reconnect
- [x] Conflict resolution: server value always wins once synced
- Notes:
  - Reconnect detection (the NetInfo piece deferred from Phase 4) landed in the Today screen via `expo-network`: `addNetworkStateListener` tracks the offline→online edge and triggers `syncNow()` immediately, and the baseline is seeded with `getNetworkStateAsync()`. It lives in the Today screen with the other sync triggers so the "Pending sync" label clears the moment a flush succeeds — no global module or cross-component event plumbing needed.
  - `syncNow()` hardened: it now short-circuits entirely when the pending queue is empty (the 30s interval becomes a no-op) and skips network attempts while `isConnected === false`, leaving reconnection to the listener. When a flush does run, the server-merged array is still mirrored into the local cache and today's queue is only cleared if unchanged post-POST (no lost mid-flight check-ins).
  - Mobile unit tests added via **jest-expo** (`npm test`): 7 tests in `src/services/__tests__/logs.test.ts` covering the offline queue/merge/conflict semantics — default empty session, enqueue on check-in, flush+mirror happy path, server-merged value wins, failed POST keeps the date queued, a check-in that lands mid-flush is not lost, and multi-date flush. AsyncStorage is mocked with the official jest mock; `submitLog` is mocked at the module boundary.
  - Test tooling: `jest-expo ~57.0.3`, `jest ~29.7.0`, `@types/jest` added as devDependencies; `"test": "jest"` script + `jest-expo` preset in package.json; `"types": ["jest"]` added to tsconfig so the test file typechecks.
  - Verified: `tsc --noEmit` clean, `expo lint` clean, `npm test` 7/7 passing, `expo export` (web) bundles.
  - **Not yet done:** real airplane-mode verification on-device (Phase 9); the offline gate uses `isConnected` (interface up), not internet reachability — if the phone is on a captive/limited network the flush attempt will simply fail and retry on the next trigger.

## Phase 9 — Human-Driven Test Loop ⚠️ requires explicit human check-in before starting
- [ ] Real-device testing (not just simulator)
- [ ] Bug list compiled and triaged
- [ ] Fixes applied and re-tested
- Notes:
  - Environment brought up: backend live on Atlas (real `MONGO_URI` + `JWT_SECRET` filled in, `CONNECT_OK`, listening on 0.0.0.0:5000), roadmap seeded with 8 clearly-labeled PLACEHOLDER phases (`npm run seed` → 8 inserted), API smoke-tested (register / roadmap / roadmap-today / streak 0→1 / badges), Metro running `--lan` on 0.0.0.0:8081 with `EXPO_PUBLIC_API_URL=http://192.168.1.33:5000` baked in via `mobile/.env.local`, firewall rules added for ports 5000/8081. Note: on-device bundling + the streak smoke test used localhost-reachable server — on-phone API reachability to 192.168.1.33 still to confirm.
  - Expo Go version mismatch (user's Expo Go older than SDK 57) fixed by sideloading the SDK 57 APK from the expo-go-releases GitHub; device now bundles and runs.
  - **Bug 1 (FIXED):** app crashed at startup in Expo Go Android — `import * as Notifications from 'expo-notifications'` executes the module at bundle-load time and that module throws on Expo Go Android (SDK 53+ removed notifications from Expo Go) → whole app failed to boot. Fix: `services/notifications.ts` now lazy-loads expo-notifications via a guarded `require()` with a `moduleLoaded` flag, keeps `import type *` for the `SchedulableTriggerInputTypes` enum so types still work, installs `setNotificationHandler` once on first successful load, and every exported function degrades gracefully (permission → false, schedule/cancel → no-op, `ensureScheduleExists` → returns without throwing). No changes needed in consumers (`_layout.tsx` ReminderSync, onboarding, settings) — they already handle a false/no-op path. Verified `tsc --noEmit` clean, `expo lint` clean, 7/7 jest. Notifications remain untestable in Expo Go by design — needs a dev build or the Phase 10 APK. Pending: user reloads the app on the device to confirm the boot fix.

## Phase 10 — Build & Deployment ⚠️ requires explicit human confirmation before proceeding
- [x] Backend deployed (Render/Railway)
- [x] EAS build produces installable APK
- [ ] APK tested on the actual target device
- Notes:
  - **Backend live on Render** at `https://study-streak-api.onrender.com` (service `study-streak-api`, free plan, `rootDir: backend`, `startCommand: npm start`). Deployed via `render.yaml` blueprint at repo root (secrets `MONGO_URI` + `JWT_SECRET` set with `sync: false` so they're entered in the dashboard, never committed). Repo pushed to `github.com/vishwakarma-31/study-streak` (main).
  - Atlas Network Access opened to `0.0.0.0/0` (first deploy failed with `MongooseServerSelectionError` — Render's egress IP wasn't whitelisted; free-tier egress IPs are dynamic so a single IP wouldn't stay valid. DB access is still gated by the connection-string credentials).
  - Deployed API smoke-tested live: `GET /health` ok, `POST /auth/register` → 201 + token, `GET /roadmap` (8 seeded phases), `GET /roadmap/today` (phase 1 wk 1, 4 blocks, sunday), `GET /streak` zeros, `GET /badges` []. `GET /` returns Express's default 404 — no root route by design.
  - **Mobile build config**: `android.package: com.studystreak.app`, `versionCode: 1`, `eas.json` created (preview + production profiles, `buildType: apk`, `promptToConfigurePushNotifications: false` since local scheduling needs no push credentials). EAS project linked (`projectId 062b6ed0-…`, account `mickey_31`); keystore auto-generated in the cloud.
  - **APK built** (`preview` profile): build `604a5156-d609-4ff5-a300-d2de611eabf6`, 107 MB, verified valid ZIP/APK. Local copy: `%TEMP%\opencode\study-streak.apk`. Download: `https://expo.dev/accounts/mickey_31/projects/mobile/builds/604a5156-d609-4ff5-a300-d2de611eabf6` (direct artifact: `https://expo.dev/artifacts/eas/FooKtEeA87USk_Off8AxYVHrjQpEBYUoS09m5CWV--I.apk`).
  - **API URL wiring**: `mobile/src/services/config.ts` fallback default is now the Render URL (`EXPO_PUBLIC_API_URL` still overrides for dev via `.env.local`), so the APK talks to the deployed backend without EAS env plumbing.
  - **APK boots on the target device** (confirmed by human). Pending final confirmation: login/account against the deployed backend, Today-screen sync, and the notification permission prompt (the APK can show it — unlike Expo Go). The Expo Go "account not found" error when scanning the build-page QR is expected — Expo Go deep-links the expo.dev URL as a project; install the standalone APK via the artifact URL instead.
  - **Post-deploy fix (unmarking blocks):** `POST /logs/:date` previously OR-merged `sessionsCompleted` (a `false` could never clear a stored `true`), so a mistakenly-checked block couldn't be unmarked — the sync mirrored the server's unchanged array back and the UI snapped back to checked. Fixed: the client-sent array is now authoritative (safe for single-device use since the client always sends latest-state per date), and the streak is recomputed from all daily logs on each write so un-completing a day rolls the streak back. Backend tests: 57 passing (added `computeStreakFromLogs` unit tests + unmark/rollback integration tests). No mobile code change and no new APK needed — redeploy only.
  - **Session 2026-08-09 (roadmap live):** `backend/src/seed/roadmap.json` replaced the PLACEHOLDER data with the real plan from `roadmap.md`. `npm run seed` → 8 updated; verified in Atlas (P1 4 weeks, P2–P8 8 weeks, real topics). Live on both local (:5000) and Render — no code change/redeploy needed since roadmap is DB reference data. The installed APK may still show the cached placeholder roadmap until the Today/Roadmap screens refresh (`cache_roadmap`, `cache_roadmap_today`) — they fetch fresh on mount when online, or after a sign-out/sign-in.