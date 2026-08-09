# SETUP.md — Study Streak App

Steps to get from zero to a working project with OpenCode.

## 1. Prerequisites

- Node.js (LTS, v20+) and npm installed
- An OpenRouter API key (for OpenCode's LLM access — same as your Dark Pattern Detector setup)
- A MongoDB Atlas account (free tier is enough for single-user scale)
- An Expo account (free) — needed for EAS Build later
- Android phone for testing (or an emulator, but real-device testing is required in Phase 9 regardless)

## 2. MongoDB Atlas Setup

1. Create a free cluster at mongodb.com/atlas
2. Create a database user with a password
3. Add your current IP (or `0.0.0.0/0` for development convenience — tighten before Phase 10) to network access
4. Copy the connection string — this becomes `MONGO_URI`

## 3. Repo Initialization

```bash
mkdir study-streak-app && cd study-streak-app
mkdir backend mobile
```

Copy `AGENTS.md`, `progress.md`, `decisions.md`, `PHASE_PROMPTS.md`, and the `skills/` folder into the repo root — OpenCode should be pointed at this directory so it reads them automatically each session.

## 4. Backend Setup

```bash
cd backend
npm init -y
npm install express mongoose bcrypt jsonwebtoken dotenv cors node-cron
npm install --save-dev nodemon jest supertest
```

Create `.env` from `.env.example` in AGENTS.md, fill in `MONGO_URI` and a `JWT_SECRET` (any long random string).

## 5. Mobile Setup

```bash
cd ../mobile
npx create-expo-app . 
npm install @react-navigation/native @react-navigation/native-stack
npm install @react-native-async-storage/async-storage
npm install axios
npx expo install expo-notifications expo-device expo-constants
```

## 6. Running Locally

```bash
# Backend
cd backend && npm run dev

# Mobile (in a separate terminal)
cd mobile && npx expo start
```

Scan the QR code with Expo Go on your phone for fast iteration during early phases. Note: Expo Go has some notification limitations — full local notification testing should happen on an EAS development build once Phase 5 is underway, not just Expo Go.

## 7. Starting OpenCode

Point OpenCode at the repo root so `AGENTS.md`, `progress.md`, and `decisions.md` are in its working context. Start with the Phase 1 prompt from `PHASE_PROMPTS.md`. Work through phases in order — don't jump ahead, since later phases assume earlier ones are actually done, not just scaffolded.

## 8. Deployment (Phase 10 — only after explicit go-ahead)

- Backend: connect the repo to Render or Railway, set the same env vars there
- Mobile: `eas build -p android --profile preview` produces an installable APK you can send directly to her phone (via Drive/direct transfer) — no Play Store submission needed for this use case