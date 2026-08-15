# Skill: Custom Tasks

Read this before implementing Phase 19. This defines the custom-task feature and exactly how it changes day-completion — get the interaction with `skills/streak-logic.md` right, this is the trickiest part of the whole app.

## What It Is

The user can add her own task for the current day, on top of the 4 fixed blocks. Once at least one custom task exists for a date, that date's completion rule changes from "3 of 4 blocks" to "3 of 4 blocks **and** every custom task for that date is also completed."

## Explicit Design Decisions (already confirmed, don't re-litigate)

- **No cutoff time for adding a custom task.** She can add one at 11:58 pm if she wants — that's her call and her risk. Don't build any time-based restriction.
- **Custom tasks can only be added for today's date, never backdated.** This isn't just a nice-to-have — it keeps the streak tamper-proof the same way server-side calculation does. Allowing a custom task to be retroactively added to a past date (and then left incomplete) would let someone selectively invalidate old completed days, which has no legitimate use case here.
- **Adding a custom task after the day was already marked complete un-marks it**, visibly, in real time — this is intended behavior per skills/streak-logic.md's provisional-today model, not a bug to guard against.

## Data Model

### `customTasks`
| Field | Type |
|---|---|
| userId | ObjectId |
| date | String (`YYYY-MM-DD`) — must equal today's date at creation time, enforced server-side |
| title | String |
| completed | Boolean |
| createdAt | Date |

## API

| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/custom-tasks/:date` | — | List custom tasks for a date |
| POST | `/custom-tasks` | `{ date, title }` | Server rejects if `date` isn't today |
| PATCH | `/custom-tasks/:id` | `{ completed }` | Toggles completion, triggers a dayCompleted recompute per skills/streak-logic.md |
| DELETE | `/custom-tasks/:id` | — | Allow removal — if she added something impulsively and wants to undo it, don't trap her into an incomplete day she didn't really want |

## dayCompleted Formula (update from the original)

```
dayCompleted(date) =
  sessionsCompletedCount(date) >= 3
  AND (customTasks(date).length == 0 OR every task in customTasks(date) has completed == true)
```

Any create/update/delete on `customTasks` for today must trigger the same real-time recompute described in skills/streak-logic.md's provisional-today model — not just session checkbox toggles.

## Mobile UI

- "+ Add task" affordance on the Today screen, below the 4 fixed blocks
- Custom tasks render in their own small section, visually distinct from the 4 fixed blocks (different card treatment — these are hers, not the roadmap's)
- If any custom task is incomplete, the streak/progress indicator should make it visually obvious *why* today isn't counted yet (e.g. "3/4 blocks done — 1 custom task left") rather than just showing a flat incomplete state with no explanation
- Deleting a custom task should be easy (swipe or a small remove control) — she may add something on a whim and change her mind