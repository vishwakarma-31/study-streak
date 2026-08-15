# Skill: Offline-First Sync

Read this before implementing Phase 4's check-in flow or Phase 8's offline hardening.

## Why This Matters

Her first study block starts at 4:15 am. Phone signal or data connectivity at that hour isn't guaranteed to be instant, and the app needs to feel responsive regardless. Nobody should have to wait on a network call just to tick a checkbox.

## Pattern

1. **Optimistic local write first.** When a block is checked, write immediately to AsyncStorage and update the UI instantly. Never block the UI on a network call for this interaction.
2. **Queue the sync.** Add the change to a pending-sync queue (also in AsyncStorage, so it survives an app close before syncing).
3. **Sync opportunistically.** On app foreground, on network reconnect, and periodically while the app is open, attempt to flush the queue to `POST /logs/:date`.
4. **Server is authoritative once synced.** After a successful sync, overwrite local streak display with the server's returned value (from skills/streak-logic.md's calculation) — don't keep computing or displaying a locally-guessed streak past that point.

## Conflict Resolution

If the same date gets synced twice (e.g. she checked boxes offline, then opened the app again later and checked more before the first sync completed), the backend's `POST /logs/:date` should be an **upsert that merges** `sessionsCompleted` (true stays true, never gets overwritten back to false by a stale local sync) rather than a blind overwrite.

## What NOT to Do

- Don't silently drop a queued sync if it fails — retry with backoff, and only show a subtle "not yet synced" indicator, never block her from continuing to use the app.
- Don't try to compute the authoritative streak on-device. Local state is for instant UI feedback only; skills/streak-logic.md's algorithm runs server-side.