# Loop Goal — Reconcile Ascend Branding (Phase 18a)

## Status check first (read before writing any code)
Real current state, verified against the live repo — not against decisions.md, which is stale on this one point:

- `mobile/app.json`: `name` is already `"Ascend"`, `scheme` is already `"ascend"`. Android `package` is unchanged (`com.studystreak.app`) — that's correct and deliberate, per the Phase 10 decision that the package id must stay permanent once installed on a device.
- `mobile/assets/images/logo.png` and `icon-adaptive-foreground.png`: an early draft of the geometric "A" mark already exists — two tapered strokes, iron-grey base fading to radiant white/cyan at the apex. It does not read cleanly as an "A" at small sizes; the strokes blur into a soft triangle. This is the "first stroke-based draft, being rebuilt as filled polygons" mentioned in the last working session — that rebuild never finished.
- `mobile/src/constants/theme.ts` and every screen: still fully "The Study Ledger" — paper background, ink text, ballpoint-blue tint (`#2456A0`), serif/mono touches, flame iconography removed. This was a deliberate, reasoned decision (see decisions.md's Phase 18 Ledger entry) and nothing in the later branding conversation said to revert it.
- **`decisions.md` has no entry at all for the app.json rename to "Ascend."** It documents the Ledger visual redesign but not the name/scheme change that happened alongside or after it. That's the actual gap here — not a code conflict.

**Conclusion for this loop:** Ascend is the name + icon identity, layered on top of the already-shipped Ledger interior (palette, typography, layout, ledger motifs, no-flame rule). This is not a revert of the Phase 18 Ledger work — it's finishing what was left unfinished (the icon) and documenting what was left undocumented (the rename). Do not touch `theme.ts`, screen layouts, or typography in this loop. Do not bring the flame icon back.

## Objective
Finish the Ascend icon/logo asset pipeline, and bring `decisions.md` / `progress.md` up to date with what's actually true, so future sessions stop re-discovering this gap.

## Non-negotiables (per AGENTS.md)
1. No copyrighted or reference-traced iconography — this is an original mark, same rule as the Phase 11 rank-tier artwork.
2. Read `decisions.md` in full before editing it — append only, never rewrite history (existing project convention).
3. Any meaningful choice (exact hex stops, filled-polygon technique, asset export pipeline) gets one row in `decisions.md` with a one-line rationale.

## Scope
1. **Rebuild the "A" mark as solid filled polygons**, not strokes. Two legs converging to a shared apex point — no gap at the top, no rounded stroke caps at the base (flat or subtly chamfered feet instead). Keep the existing gradient concept (iron-grey → radiant white/cyan) since it already encodes the same Iron→Radiant tier climb as the Phase 11 rank artwork — reuse those exact tier colors rather than inventing new ones, for consistency across the app.
2. **Regenerate every derived asset from one master SVG**: `icon.png`, `icon-adaptive-foreground.png` (transparent, foreground-only, sized against `app.json`'s `adaptiveIcon.backgroundColor: "#F5F4F0"`), `splash-icon.png` (rendered at `imageWidth: 76` per app.json — check legibility at that exact size), `favicon.png`. Use a real SVG → PNG render pipeline at each required resolution, not hand-exported guesses.
3. **Verify at actual render sizes** — 48px and 96px (Android adaptive-icon mip levels) and the 76px splash width specifically, since the current draft's problem was a small-size problem. If it still muddies at 48px, simplify further (wider legs, less glow softness) before calling this done.
4. **Do not change** `app.json`'s `name`, `scheme`, `android.package`, or `adaptiveIcon.backgroundColor` — already correct, already shipped.
5. **Write the missing decisions.md entry** for the original app.json rename (mark it "backfilled" since the exact original session date isn't recoverable) plus a new entry for this loop's filled-polygon rebuild.
6. **Update progress.md**: add an explicit "Phase 18a — Ascend Branding" block (template in `PROGRESS_DECISIONS_UPDATE.md`) so the checklist stops silently stopping at Phase 15.

## Out of scope — do not touch
- `theme.ts`, any screen component, typography, ledger motifs — the Study Ledger interior stays as-is.
- Backend code, streak/rank logic — unrelated to this loop.
- Phase 18 alarms / Phase 19 custom tasks — separate loop goal (`01-phase18-alarms-and-phase19-custom-tasks.md`). Don't start that work here even if it feels adjacent.

## Definition of done
- [ ] `logo.png`, `icon.png`, `icon-adaptive-foreground.png`, `splash-icon.png`, `favicon.png` all regenerated from one source SVG, filled-polygon technique, legible at 48px.
- [ ] `expo-doctor` / `expo lint` clean.
- [ ] `decisions.md` has both the backfilled rename entry and the new rebuild entry, appended below the last row.
- [ ] `progress.md` has a Phase 18a block, checked off.
- [ ] Human confirms the icon on an actual device or EAS preview build — legibility at real launcher size can't be verified from a code review alone.

## Skills / reference docs needed
- **New, write as part of this loop:** `skills/brand-identity-ascend.md` — doesn't exist yet.
- **Existing, reuse:** `skills/ranking-system.md` — for the exact tier color values to reuse in the gradient.
- The other skills referenced elsewhere in decisions.md (`streak-logic.md`, `offline-first-sync.md`, `mobile-ui-patterns.md`, `api-design-conventions.md`, `full-day-by-day-curriculum.md`) are not needed for this loop. See `PROGRESS_DECISIONS_UPDATE.md` for a note on where they actually live (they're not in git).