# Skill: Mobile UI Patterns

Read this before building any screen.

## Screen List (see AGENTS.md repo structure)

Onboarding → Today (home) → Progress → Roadmap → History → Settings

## Today Screen — the one that matters most

This is opened multiple times a day, every day. It needs to answer "what do I do right now" in under a second of looking at it:
- Streak count at the very top, large, unmissable
- The 4 blocks for today listed with their real topic (pulled from `/roadmap/today`), not generic labels like "Session 1"
- Each block: a tappable checkbox/card, clear completed vs incomplete state
- A subtle sync status indicator (synced / pending) — small, not alarming

## Progress Screen

- Contribution heatmap (GitHub-style calendar grid) — this is the single most motivating visual in the app, give it the most screen real estate
- Streak numbers directly below it
- Badges as a horizontal scroll or grid, earned ones full-color, unearned ones outlined/greyed — don't hide unearned badges, seeing what's next is motivating, hiding it isn't

## General Principles

- **No dark patterns in UI, not just copy.** No countdown timers designed to create panic, no disabled "skip" buttons, no pre-checked boxes, no interstitial ads or upsells (there's nothing to sell here, but the habit applies broadly — every interaction should do what it visually appears to do).
- **Offline state should be visually calm, not alarming.** A "not synced yet" indicator should look like a normal, expected state, not an error.
- **Respect the strict streak emotionally.** When a streak resets, the UI shouldn't dwell on it with heavy visuals or repeated messaging — show the reset once, clearly, then move forward. The goal is honest accountability, not punishment.
- Keep navigation shallow — everything reachable in 1–2 taps from Today, since this app needs to be fast to check in with, not something she has to think about navigating.

## UI Revamp Direction (v2)

The current UI (dark background, plain grey cards, generic rounded rectangles) reads as a template, not a designed product. This project uses the **ui-ux-pro-max** skill (https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), confirmed to support React Native and OpenCode. Install it first if not already present:

```
npm install -g ui-ux-pro-max-cli
cd study-streak-app
uipro init --ai opencode
```

Once installed it auto-activates on UI/UX requests. Prompt it with the React Native stack explicitly (e.g. "Build the Today screen UI for a React Native mobile app") so it picks the right stack-specific guidelines rather than defaulting to HTML+Tailwind.

**If for any reason the skill isn't available when this phase runs, fall back to this direction instead:**

- **Palette:** move off pure black/grey. A dark theme with a distinct accent color tied to the rank tiers (e.g. bronze/amber tones at low tiers shifting toward richer jewel tones — purple/teal — at higher tiers) makes the app feel alive as she progresses, not static.
- **Typography:** one strong display weight for the streak number and today's topic (what she reads at a glance), a lighter weight for supporting text (times, resource names). Avoid uniform font-weight across the whole screen — that's a big part of why it currently reads generic.
- **Cards:** differentiate the 4 session blocks visually by state (upcoming / active-now / completed / missed) — not just a checkbox toggle. E.g. the block matching the current time of day should be visually emphasized (border glow, subtle scale) so she never has to think about which one is "now."
- **Streak + rank:** these are the emotional core of the app — give them the most visual weight on Today and Progress, not buried below a generic list.
- **Motion:** small, purposeful transitions (a block completing, a tier-up) — not decorative animation everywhere, since that undercuts the "focused" feel being asked for.