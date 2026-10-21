# BYTALK — React Native + Admin + Backend

A functional **starter MVP** inspired by the provided 6-screen UI: onboarding, language level, partner discovery, chat, live rooms, and learning dashboard.

## Structure
- `mobile/`: Expo + React Native mobile app (Android / iOS).
- `admin/`: React + Vite admin console.
- `backend/`: Express API + Socket.IO real-time chat + JSON storage.

## Requirements
Node.js 20+, npm, Expo Go (for testing on a phone). For Android emulator use Android Studio.

## Run locally (3 separate terminals)
```bash
cd backend && npm install && npm run dev
cd admin && npm install && npm run dev
cd mobile && npm install && npx expo start
```
Admin: http://localhost:5173 · API: http://localhost:4000

### Mobile API connection
For a real Android/iPhone on Wi-Fi, set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000` in `mobile/.env` (example in `.env.example`), then restart Expo. Android emulator: `http://10.0.2.2:4000`; iOS simulator: `http://localhost:4000`. Both devices must access the same network.

### Features ready in this starter
- Onboarding form and proficiency selection, profile saved in API
- Partner listing and search
- Direct messaging stored in API and broadcast by Socket.IO
- Browse and join room participant counts (room presence is simplified)
- Learning progress + save vocab category
- Admin overview with users, rooms and reported content moderation
- Persistent demo data in `backend/data/store.json` (created automatically)

### Important limitations
This is an **MVP, not a production app**. No authenticated sessions, phone verification, user block flow, end-to-end encryption, push notifications, audio calling, real audio streaming, real translation, payments, or AI speech evaluation. Room Join is a demo membership action, not a real microphone/audio session. Add secure authentication, authorization (especially for admin), rate limiting, privacy controls, abuse reporting, and a real voice SDK (Agora/LiveKit) before release. Admin is unprotected locally and should never be exposed publicly as-is.

## API routes
GET `/api/health`, `/api/users`, `/api/partners?q=`, `/api/rooms`, `/api/stats`, `/api/reports`; POST `/api/onboard`, `/api/messages`, `/api/rooms/:id/join`, `/api/vocabulary`, `/api/reports`; GET `/api/messages/:userId/:partnerId`; PATCH `/api/reports/:id`.

## Suggested production upgrades
MongoDB/Postgres, JWT/OAuth, protected admin accounts, user-to-user consent, speech SDK, translation API, background tasks, notifications, load testing, and deployment CI.
