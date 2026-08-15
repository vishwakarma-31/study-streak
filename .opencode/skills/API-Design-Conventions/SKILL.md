# Skill: API Design Conventions

Read this before writing any Express route.

## Route Structure

Follow `routes/ → controllers/` separation — routes only define the path and middleware chain, controllers hold the logic. Keep `services/streakCalculator.js` completely separate from the controller layer so it stays independently testable (see skills/streak-logic.md).

## Auth

- All routes except `/auth/register` and `/auth/login` require a valid JWT, verified via `middleware/auth.js`.
- Since this is single-user, there's no need for role checks — the middleware just needs to confirm a valid token belonging to the one existing user.
- Token payload should carry `userId` only — keep it minimal.

## Error Responses

Consistent shape across all endpoints:
```json
{ "error": "message here" }
```
Use proper status codes: 400 for bad input, 401 for auth failures, 404 for missing resources, 500 for unexpected server errors. Don't leak stack traces in production responses.

## Mongoose Conventions

- Every schema gets `timestamps: true`.
- Date fields that represent a calendar day (like `dailyLogs.date`) are stored as a plain string (`YYYY-MM-DD`), not a `Date` object — this avoids timezone reinterpretation bugs. See skills/streak-logic.md for why this matters.
- Use `.lean()` for read-only queries (roadmap fetches, history lists) to skip unnecessary Mongoose document overhead.

## Endpoint Contracts

Match these exactly — the mobile app is built against this contract:

| Method | Route | Body | Returns |
|---|---|---|---|
| POST | /auth/register | `{ name, email, password }` | `{ token }` |
| POST | /auth/login | `{ email, password }` | `{ token }` |
| GET | /roadmap | — | full 8-phase roadmap array |
| GET | /roadmap/today | — | `{ phase, week, topic, blocks: [...], resources }` |
| GET | /logs/:date | — | that day's log or `null` |
| POST | /logs/:date | `{ sessionsCompleted: [bool,bool,bool,bool] }` | updated log + current streak |
| PATCH | /logs/:date/note | `{ note }` | updated log |
| GET | /logs/history | — | array of past dailyLogs: `[{ date, sessionsCompletedCount, dayCompleted, note, dsaProblems }]`, newest-first, default last 60 days (optional `?from=&to=`) |
| GET | /streak | — | `{ currentStreak, longestStreak, history: [...] }` |
| GET | /badges | — | array of earned badges |