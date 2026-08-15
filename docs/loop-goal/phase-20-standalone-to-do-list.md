# Loop Goal — Phase 20: Standalone To-Do List

## Why this is a separate phase from Phase 19
Phase 19 adds exactly **one** dynamic item per day, tightly coupled to the streak — it's an extension of the existing accountability system. This is different: a general-purpose, open-ended to-do list — add any number of items, anytime, edit/delete/reorder, optionally give a due date — the way any ordinary to-do app works.

**Keep these decoupled.** Feeding an unbounded, freely-editable list into the strict streak calculation would break the "tamper-proof, fixed roadmap" invariant AGENTS.md has held since Phase 1 — a padded or imaginary todo could keep a streak alive. Todos here are a parallel productivity feature, not a 6th daily block. If it later turns out some todos genuinely should count toward the day, that's a deliberate future decision to fold in — not a default of this phase.

## Objective
Add a full to-do list to the app — its own screen, independent of the roadmap/streak/rank system, for general tasks (assignments, errands, anything outside the fixed study routine).

## Non-negotiables
1. **Does not touch `StreakState` or `RankState`** in any way, in this phase.
2. **Server-authoritative + offline-first**, same as everything else — AsyncStorage-first writes, sync-when-online, the same per-item pending-queue pattern already proven in `services/logs.ts`. Don't invent a second sync strategy.
3. **No dark patterns** — no streaks, badges, or gamification bolted onto the todo list. It's a plain, calm list; the existing streak/rank system is already the app's motivation mechanism.
4. Single-user JWT auth, reused as-is — no new auth concept needed.

## Proposed data model
New `Todo` model (`backend/src/models/Todo.js`):
```js
{
  userId: ObjectId (ref User, required),
  title: String (required, trimmed),
  notes: String (default ''),
  done: Boolean (default false),
  dueDate: String | null,      // YYYY-MM-DD, optional
  priority: enum ['low','normal','high'] (default 'normal'),
  order: Number,                // manual drag-reorder position
  completedAt: Date | null,     // server-set, not client-trusted
  // timestamps: true
}
```
Index: `{ userId: 1, done: 1, order: 1 }` — list queries always filter by user + done-status, sorted by order.

## API surface
New `backend/src/routes/todos.js`, mounted at `/todos`, JWT-protected like every other route:
- `GET /todos` — list, optional `?done=true|false`, sorted by `order`.
- `POST /todos` — create `{ title, notes?, dueDate?, priority? }`.
- `PATCH /todos/:id` — partial update. Toggling `done` sets/clears `completedAt` **server-side** — never trust a client-sent `completedAt`.
- `DELETE /todos/:id` — hard delete (todos aren't a historical record the way `DailyLog` is).
- `PATCH /todos/reorder` — bulk reorder: `{ orderedIds: [...] }`, sets `order` sequentially. One endpoint here beats N individual PATCH calls mid-drag-gesture.

Follow `skills/api-design-conventions.md` — thin controllers, `.lean()` on reads, consistent `{ error: string }` error shape.

## Mobile scope
1. New tab or screen: `src/app/(tabs)/todos.tsx`. Check against `skills/mobile-ui-patterns.md`'s navigation-depth guidance before assuming a 6th tab is the right call versus folding it elsewhere — don't just add a 6th icon without that check.
2. List UI: grouped not-done first, checkbox interaction matching `BlockCard`'s visual language for consistency (same precedent as Phase 17 reusing that look for `log-block-row.tsx`), due-date badge if set — color-neutral unless actually overdue, keeping the no-guilt principle even in a plain productivity list.
3. `services/todos.ts` — mirrors `services/logs.ts`'s offline pattern: local cache + pending-mutation queue, flushed on the same triggers already wired in the Today screen (toggle/foreground/reconnect/interval), scoped to this screen's own lifecycle.
4. Offline-conflict rule: last-write-wins is fine here — unlike `DailyLog`'s OR-merge/overwrite history, todos are single-device/single-user with no "true can't become false" sensitivity. Whatever the client had queued wins on flush.

## Testing
- Backend integration tests for all 5 endpoints (happy path + auth-required), matching `api.integration.test.js`'s existing pattern.
- Mobile: extend the jest-expo suite with an offline-queue test for `services/todos.ts`, mirroring `logs.test.ts`'s coverage (enqueue, flush, multi-item flush, failed-flush retry).

## Definition of done
- [ ] `Todo` model + all 5 endpoints, tested.
- [ ] Todos screen built, offline-first, zero streak/rank coupling anywhere in the diff.
- [ ] `decisions.md`: log the "todos are decoupled from streak" decision explicitly — the call most likely to get relitigated later, write the rationale down now.
- [ ] `progress.md` Phase 20 block, checked off.
- [ ] `skills/todo-list-feature.md` written (new).

## Skills / reference docs needed
- **Existing, reuse:** `skills/offline-first-sync.md` (queue pattern), `skills/api-design-conventions.md` (route/controller conventions), `skills/mobile-ui-patterns.md` (tab-count / navigation-depth call).
- **New, write as part of this loop:** `skills/todo-list-feature.md` — capture the decoupling rule above plus the reorder/priority/due-date conventions, so a later session doesn't accidentally wire todos into the streak.