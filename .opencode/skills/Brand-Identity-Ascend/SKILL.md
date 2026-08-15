# Skill: Brand Identity — Ascend

Read this before touching the app icon, splash, favicon, or any derived brand asset. This skill is the single source of truth for the Ascend mark and how to regenerate every icon asset from it.

## What the identity is

- **Name:** Ascend. The app's rank tiers climb Iron → Radiant, so the mark *is* the climb: an "A" whose fill rises from flat iron-grey at the feet to radiant white/cyan at the apex.
- **Interior:** "The Study Ledger" — paper/ink palette, ballpoint-blue accent (`#2456A0`), serif numerals, mono clock times. The mark sits **on top of** that interior (launcher/splash surfaces); the Ledger stays untouched inside the app (see `decisions.md` Phase 18 Ledger entry).
- **No flames.** Flame iconography was deliberately removed (Phase 18). Do not reintroduce it.
- **No copyrighted/reference-traced art.** The mark is original geometry, same rule as the Phase 11 tier badges.

## The master SVG

`mobile/assets/images/source/ascend-mark.svg` — the **single source** for every derived PNG. Never hand-edit a derived PNG.

- Canvas `1024×1024`, `viewBox="0 0 1024 1024"`, transparent background.
- Three **solid filled polygons** (no strokes — the old tapered-stroke draft blurred into a soft triangle at 48px; filled polygons hold their silhouette):
  - left leg: `510,208 252,820 372,820`
  - right leg: `514,208 772,820 652,820`
  - crossbar: `428,540 590,540 612,620 412,620`
- Legs converge to a **shared apex** with a 4px horizontal overlap (top edges at x=510 and x=514) so anti-aliasing can't leave a hairline gap at the tip. Feet are flat (no rounded caps).
- Crossbar overlaps both legs' inner edges by ~6px — invisible because all three polygons share one gradient, so no seam can show.
- Mark extents: x 252→772, y 208→820 — centered, inside the 66% adaptive-icon safe zone.

## The gradient

One `linearGradient`, `gradientUnits="userSpaceOnUse"` (NOT `objectBoundingBox`) so all three polygons resolve identical colors at every point:

```
<linearGradient id="ascend" gradientUnits="userSpaceOnUse" x1="512" y1="808" x2="512" y2="208">
  <stop offset="0"   stop-color="#8E8E93" />  <!-- Iron, TIER_META.Iron.color -->
  <stop offset="0.3" stop-color="#A9B8BE" />
  <stop offset="0.65" stop-color="#D9E7EA" />
  <stop offset="1"   stop-color="#F4FBFC" />
</linearGradient>
```

- Endpoints are `TIER_META.Iron.color` (`#8E8E93`) and the radiant apex `#F4FBFC`; the two mid-stops are interpolations. These are the *exact* hex stops recorded in `decisions.md`.
- If the palette ever changes, update `mobile/src/constants/rank.ts` and this gradient together — they must not drift.

## Regenerating the derived assets

Run from `mobile/`:

```
npm i -D @resvg/resvg-js        # once
node scripts/render-icons.js    # after any change to the master SVG
```

`scripts/render-icons.js` rasterizes the master SVG at each pinned size via `@resvg/resvg-js` (pure-Rust, no native build step) and writes:

| Asset | Size | Surface |
|---|---|---|
| `logo.png` | 1024×1024 | paper `#F5F4F0` baked in (app icon / iOS icon) |
| `icon.png` | 1024×1024 | paper `#F5F4F0` baked in (Expo default asset name) |
| `icon-adaptive-foreground.png` | 1024×1024 | transparent, foreground-only |
| `splash-icon.png` | 228×228 | transparent (3× of `imageWidth: 76`) |
| `favicon.png` | 48×48 | transparent |

- `app.json` pins: `icon`/`ios.icon` = `logo.png`, `adaptiveIcon.foregroundImage` = `icon-adaptive-foreground.png`, `adaptiveIcon.backgroundColor` = `#F5F4F0`, splash `image` = `splash-icon.png` + `imageWidth: 76`, `web.favicon` = `favicon.png`. Keep those in sync if you add assets.
- Do **not** change `app.json`'s `name` ("Ascend"), `scheme` ("ascend"), `android.package` (`com.studystreak.app`), or `adaptiveIcon.backgroundColor`. Package id is permanent once installed (Phase 10 decision); `slug` must stay `mobile` (matches the EAS projectId — renaming it breaks builds).

## Verifying

`node scripts/verify-icons.js` renders at 48/76/96px and asserts: ink stays inside the safe zone (≈x 0.25–0.74, y 0.20–0.80), both counter holes are empty, legs/crossbar/feet exist, and the gradient is light at the apex → dark at the feet. It prints a JSON line per size; all checks should read `true`/expected values.

A human still must eyeball the icon at real launcher size on a device/EAS preview before shipping — geometry checks can't prove perceptual legibility.
