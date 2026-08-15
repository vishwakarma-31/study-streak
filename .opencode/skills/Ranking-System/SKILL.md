# Skill: Ranking System

Read this before implementing Phase 11. This defines an original tiered-rank mechanic — same climb-and-subdivide feel as competitive game ranks, but with original tier names/visuals (not reproducing any game's actual branding, icons, or trademarked tier names).

## Why a Separate Track from the Streak

The streak is strict — one missed day resets it to 0. If rank also reset to zero on a miss, it would double-punish a single bad day and could feel demoralizing enough to make her quit rather than restart. Rank Points (RP) are a **separate, cumulative** track: they only move up on a completed day and never drop on a miss. The streak still enforces daily discipline; rank reflects long-term consistency without wiping out months of progress over one rough day.

## Tiers

Using Valorant's actual tier names, since this is a private single-user app (not distributed). **Note:** tier names are reused, but the actual icon/artwork assets are not — those are copyrighted images and won't be sourced or embedded here even for personal use. Design original icon art in a similar palette/spirit for each tier instead (see UI notes below).

| Tier | RP range | Sub-tiers |
|---|---|---|
| Iron | 0–299 | I, II, III (100 RP each) |
| Bronze | 300–599 | I, II, III |
| Silver | 600–899 | I, II, III |
| Gold | 900–1199 | I, II, III |
| Platinum | 1200–1499 | I, II, III |
| Diamond | 1500–1799 | I, II, III |
| Ascendant | 1800–2099 | I, II, III |
| Immortal | 2100–2399 | I, II, III |
| Radiant | 2400+ | single open-ended tier, no sub-divisions (matches the real system — Radiant has no sub-tiers) |

## RP Earning Rules

- **+20 RP** for each day marked complete (≥3 of 4 blocks — same threshold as the streak)
- **No RP loss** for a missed day — the streak already carries the consequence for that; rank only ever moves forward
- **Bonus +50 RP** on completing a phase's major project (8 total across the roadmap) — makes finishing a phase feel like a real milestone, not just another day

## Data Model Addition

### `rankState`
| Field | Type |
|---|---|
| userId | ObjectId |
| totalRP | Number |
| currentTier | String |
| currentSubTier | String (null for Radiant) |
| rpIntoCurrentSubTier | Number (for the progress bar, 0–99) |

## Calculation (isolated in `services/rankCalculator.js`, mirrors streakCalculator.js)

```
On a completed day:
  totalRP += 20
  (if phase project just marked complete: totalRP += 50)
  recompute currentTier / currentSubTier / rpIntoCurrentSubTier from totalRP
```

Keep this in its own service file, same pattern as `streakCalculator.js` — don't inline rank math into controllers.

## UI Notes

- Show tier + sub-tier prominently on the Progress screen, with a progress bar toward the next sub-tier (or next tier, at Radiant's boundary)
- A tier-up moment deserves a small celebratory animation/moment — this is one place where positive reinforcement is appropriate and not a dark pattern, since it's celebrating genuine earned progress, not manufacturing urgency
- Never show RP loss or downward movement anywhere in the UI — there isn't any, by design
- **Icon/visual assets:** design original artwork for each tier badge — don't source or embed Riot's actual copyrighted icon files, even though this app is private. A reasonable approach: original geometric badge shapes using a color progression that echoes each tier's real-world association (iron = dull grey, bronze = warm copper, gold = gold, diamond = icy blue, radiant = bright gradient), without copying the actual artwork.