# progress.md / decisions.md — updates to apply now, and the discipline going forward

## Why this file exists
Three things converged: (1) the real branding state vs. what's committed and documented, (2) picking Phase 18/19 back up, (3) a new Phase 20. This file is the concrete patch — paste these blocks into the real `progress.md` and `decisions.md`. Going forward: **every loop goal in this folder ends with its own progress.md/decisions.md updates as part of its Definition of Done — not deferred to "end of session."** That's the fix for how the Ascend-rename gap happened in the first place.

---

## 1. Append to `AGENTS.md`, section 4 ("How to Work Across Sessions")
Strengthen item 3 from "end of session" to "end of every meaningful change":

> 3. **After every meaningful change** (not just at session end): update `progress.md` — check off the specific subtask just completed. If a technical choice was made, log it in `decisions.md` immediately, not batched for later. Batching decision-logging to end-of-session is how the Ascend-rename gap happened — do not repeat it.

---

## 2. `decisions.md` — new rows to append (append only, do not edit history above)

| Date | Decision | Rationale | Alternative considered |
|---|---|---|---|
| Backfilled | App renamed "Ascend" in `app.json` (`name`, `scheme`); Android `package` deliberately left as `com.studystreak.app` | Rename ties the app to the Immortal/Radiant rank-tier language and the geometric "A" mark; changing the Android package post-install would force a reinstall and lose local AsyncStorage data, already ruled out by the Phase 10 decision | Changing the package id to something Ascend-branded — rejected, same reasoning as the original Phase 10 package-id decision |
| Phase 18a | "A" mark rebuilt from tapered strokes to solid filled polygons, gradient stops reused from the Phase 11 rank-tier palette (iron-grey → radiant white/cyan) | The stroke version blurred into an unreadable soft triangle at 48px launcher size; filled polygons hold their silhouette at small sizes, and reusing tier colors keeps the mark visually consistent with the in-app rank system | Keeping the stroke/glow treatment and increasing stroke width — still muddies below ~64px |
| Phase 19 | RP awarding moved from write-time (`upsertLog`) to midnight cron finalization | The custom-task-of-the-day feature can flip a day complete→incomplete intra-day (streak dips); RP must never decrease, so it can't be awarded the moment a day first becomes complete — it has to wait until the day is over | Keeping write-time RP and blocking the decrement with a flag — rejected, duplicates the finalization the cron job already exists to do |
| Phase 20 | To-do list is fully decoupled from `StreakState`/`RankState` — a parallel feature, not a 6th daily block | An unbounded, freely-editable list feeding the strict streak would let a padded/imaginary todo keep a streak alive, breaking the tamper-proof-fixed-roadmap invariant from AGENTS.md | Letting todos optionally count toward day-completion — considered, deferred as a future decision, not a default |

---

## 3. `progress.md` — new blocks to append
The checklist section currently stops at Phase 15 even though narrative Phase 16/17 notes already exist further down in the file. Fold those into the checklist while appending the new phases:

```
## Phase 16 — Pre-Handoff Audit (cold start + battery optimization)
- [x] Render cold-start mitigation: client warm-up state + keep-alive doc
- [x] One-time OEM battery-optimization prompt (Android)
- [x] Today-screen poll interval reduced 30s → 150s
(Narrative already exists in decisions.md — this block makes it visible in the checklist, which previously stopped at Phase 15.)

## Phase 17 — History Detail View
- [x] GET /logs/:date extended with per-block detail
- [x] History rows open a modal showing which blocks were done/missed
(Narrative already exists in decisions.md — same visibility fix as Phase 16.)

## Phase 18a — Ascend Branding Reconciliation
- [ ] "A" mark rebuilt as filled polygons (was: tapered-stroke draft)
- [ ] All derived assets regenerated from one source SVG
- [ ] Legibility verified at 48px / 96px / splash 76px width
- [ ] Backfilled decisions.md entry for the original app.json rename
- Notes: app.json name/scheme were already "Ascend" going into this phase — this phase finishes the unfinished icon and documents the already-shipped rename. See loop goal doc 00.

## Phase 18 — Alarm Notifications
- [ ] notifee wired (guarded for Expo Go, mirrors the expo-notifications lazy-load pattern)
- [ ] Per-reminder notification-vs-alarm mode, configurable in Settings
- [ ] On-device alarm verified (requires dev-client build, not Expo Go) — human confirmation required
- Notes: not started as of this update. See loop goal doc 01.

## Phase 19 — Custom Task-of-the-Day + Provisional Streak
- [ ] DailyLog.customTask field + PATCH /logs/:date/custom-task (today-only)
- [ ] computeStreakFromLogs extended for custom-task completion
- [ ] RP finalization moved to midnight cron (see decisions.md)
- [ ] GET /streak returns todayProvisional
- [ ] Mobile: add-task affordance + provisional-streak messaging on Today screen
- Notes: not started as of this update — algorithm redesign, requires explicit human confirmation before touching the live backend. See loop goal doc 01.

## Phase 20 — Standalone To-Do List
- [ ] Todo model + 5 endpoints (list/create/update/delete/reorder)
- [ ] Todos screen, offline-first via services/todos.ts
- [ ] skills/todo-list-feature.md written
- Notes: new feature, decoupled from streak/rank by design (see decisions.md). See loop goal doc 02.
```

**Also update the "Current active phase" line** at the top of `progress.md` from `14` — pick and note a convention (furthest-planned vs. next-unstarted), since the file doesn't currently say which it means.

---

## 4. Skills & documents — the full picture, and an important gap

**Gap first:** every skill referenced throughout `decisions.md` (`streak-logic.md`, `offline-first-sync.md`, `api-design-conventions.md`, `mobile-ui-patterns.md`, `ranking-system.md`, `full-day-by-day-curriculum.md`) lives in `.opencode/skills/`, which is **gitignored** — none of it is in the GitHub repo. That's fine as long as it still exists on whatever machine last ran OpenCode, but it means those files can't be verified from the repo alone, and if that machine or profile is ever lost, every decision referencing them points at something that no longer exists anywhere. Worth committing them somewhere tracked — either carve out `.opencode/skills/` specifically from the gitignore rule (leaving the rest of `.opencode/`, session/cache data, ignored), or mirror them into a plain `docs/skills/` folder.

| Loop goal | Existing skills to reuse | New skills to write |
|---|---|---|
| 00 — Ascend branding | `skills/ranking-system.md` (tier color values) | `skills/brand-identity-ascend.md` |
| 01 — Phase 18 alarms | (reference existing notifications code) | — |
| 01 — Phase 19 custom task | `skills/streak-logic.md`, `skills/ranking-system.md` (amend both, don't create new) | — |
| 02 — Phase 20 todos | `skills/offline-first-sync.md`, `skills/api-design-conventions.md`, `skills/mobile-ui-patterns.md` | `skills/todo-list-feature.md` |