# Study Streak — mobile app

React Native (Expo SDK 57) companion app for the single-user study streak system. The streak is
computed and stored server-side; the client only displays it. Days count as complete when at
least 3 of the 4 daily blocks are checked off.

## Run it

```bash
npm install
npx expo start
```

Point the app at your backend with a `.env.local` file (defaults to the deployed Render API):

```
EXPO_PUBLIC_API_URL=https://study-streak-api.onrender.com
```

## Build an APK

```bash
npx eas build --platform android --profile preview
```

Standalone builds (not Expo Go) are required for notifications — Expo Go removed
`expo-notifications` on Android.

## Notifications on OEM Android

Reminders are scheduled locally via `expo-notifications`. On many Chinese OEM ROMs the system
silently kills an app's notifications when its battery saver is active, even if the app scheduled
them correctly. This cannot be fixed from inside the app — the user must allow the app in the
phone's battery settings. The app shows a one-time hint (onboarding + Settings) that deep-links to
`android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`.

OEMs commonly affected (all of these need battery optimization disabled / autostart enabled for
the app):

- **Xiaomi / Redmi** (MIUI / HyperOS) — Settings → Apps → Manage apps → Study Streak → Battery saver → No restrictions; also Autostart on
- **OPPO / OnePlus** (ColorOS / OxygenOS) — Settings → Battery → App battery management → Study Streak → Allow
- **Vivo** (Funtouch / OriginOS) — Settings → Battery → Background power consumption management → Study Streak → Allow background running
- **Realme** (Realme UI) — same path as OPPO (ColorOS-based)

Samsung, Pixel, and stock Android generally deliver local notifications reliably without these
steps.

## Tests

```bash
npm test        # jest (offline queue/merge + date helpers)
npx tsc --noEmit
npx expo lint
```
