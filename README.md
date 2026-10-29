# BYTALK

BYTALK is an Expo language-exchange app with authenticated direct messaging and one-to-one audio/video calling.

## Requirements

- Node.js 20.6 or newer and npm.
- Android Studio for Android development builds.
- macOS with Xcode for iOS development builds.
- A modern browser for web. Camera/microphone access requires HTTPS, except on `localhost`.

## Project structure

- `mobile/`: Expo app for Android, iOS, and web.
- `backend/`: Express API, MongoDB authentication/user profiles, Socket.IO chat/call signaling, and local JSON persistence for non-user app data.
- `admin/`: existing web admin console.

## Start the backend (Windows PowerShell)

From the repository root, in a backend terminal:

```powershell
Set-Location backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `backend/.env` and set `MONGODB_URI` to the MongoDB Atlas connection string and a unique `JWT_SECRET` (at least 32 random bytes). Credentials belong only in this ignored backend file. For example, generate a JWT secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep the generated secret only in `backend/.env`; never put it in the Expo app or commit it. Then start the API and Socket.IO server:

```powershell
npm run dev
```

The backend listens on port `4000` by default, connects to Atlas before accepting requests, and logs only whether the connection succeeded or failed. `JWT_SECRET` is required in production. In local development, the server creates an ephemeral secret if none is set, which invalidates sessions on restart.

### Seed fictional test users

After setting `MONGODB_URI`, run this development-only, repeatable seed command from `backend`:

```powershell
npm run seed:users
```

It creates or updates three clearly fictional accounts and never creates an unauthenticated user-creation endpoint. Their password is `BytalkTest123!`. To add a real friend, get their permission first and create the account through the normal registration flow, or use a private, reviewed database operation with their name, email, and profile image URL. Never add another person's information without authorization.

The existing admin console can be started separately:

```powershell
Set-Location admin
npm install
npm run dev
```

The local admin console is not protected for public deployment; do not expose it to the internet as-is.

## ICE / TURN setup

The backend provides authenticated ICE configuration from `GET /api/rtc-config`. STUN is configurable with `RTC_STUN_URLS`. For production, configure a TURN service (for example, Coturn with REST-style shared-secret authentication) in `backend/.env`:

```dotenv
RTC_STUN_URLS=stun:stun.example.net:3478
TURN_URLS=turn:turn.example.net:3478?transport=udp,turn:turn.example.net:3478?transport=tcp
TURN_SHARED_SECRET=<same private shared secret configured on the TURN server>
```

Set the TURN service to use the same shared secret and REST authentication. The backend issues short-lived per-user TURN credentials; the shared secret stays on the server. Without a reachable TURN service, calls may fail on restrictive NATs or firewalls even when direct STUN connectivity works. Use TLS and a real TURN service for deployment.

## Start the Expo app

In another terminal:

```powershell
Set-Location mobile
npm install
npx expo start --web
```

For web on another computer, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the backend's reachable HTTP URL, then restart Expo. Android emulator defaults to `http://10.0.2.2:4000`; iOS simulator defaults to `http://localhost:4000`. A physical phone needs the computer's LAN IP, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000`.

### Native development builds

`react-native-webrtc` and `react-native-incall-manager` contain native code and do not work in Expo Go. The mobile app is pinned to the Expo SDK 54-compatible versions of `react-native-webrtc` and its config plugin. After installing dependencies, build a custom native app:

```powershell
Set-Location mobile
npx expo install expo-dev-client
npx expo run:android
```

On macOS with Xcode, use `npx expo run:ios`. These commands generate native projects and build/install the development app. Afterwards use `npx expo start` with that development build. Rebuild the app after changing native dependencies or permission/plugin configuration. Android and iOS prompt for microphone permission when a call starts and camera permission for video calls.

## Features

- Authenticated `GET /api/users/discover` returns other registered and seeded MongoDB users using real MongoDB IDs and only public profile fields. Password hashes, emails, and tokens are not returned.
- Discover partners with separate Chat, Voice, and Video actions, live online status, search, pull-to-refresh, and loading/error/empty states.
- Authenticated one-to-one messaging persisted by the backend, live Socket.IO delivery, history pagination, timestamps, delivery/read markers, presence, and typing updates.
- Authenticated call invitations, accept/reject, busy/offline checks, timeout handling, participant-only SDP/ICE signaling, reconnect/end cleanup, and persisted call history.
- WebRTC media on web and native Android/iOS with microphone mute, camera toggle/switch, and native speaker routing.
- Short-lived TURN credentials generated by the backend when TURN is configured.
- The existing rooms, vocabulary, learning dashboard, and admin experiences remain available.

Calls are only possible between signed-in users who are online in the app. Push notifications for calls while the app is closed, end-to-end encrypted messaging, and a production relational database are not included. Messages, rooms, vocabulary, reports, and call history still use the existing local JSON store for this local MVP. User accounts and profiles are stored in MongoDB Atlas. Use a transactional database for the remaining data and a durable shared Socket.IO adapter before scaling to multiple backend instances.

## Two-account browser test

1. Start the backend and web app using the commands above. Keep the web app on `http://localhost` so browser camera/microphone permissions are available.
2. Open the web app in two separate browser profiles (or one normal window and one private window).
3. Sign in with two different seeded accounts, or register a different account in each profile. Complete onboarding for both.
4. Confirm each account sees the other in Discover, with presence changing to online while both app sessions are open. Use the call buttons on either profile to call the other profile's displayed account.
5. Accept the incoming call in the second profile and allow microphone/camera access. Confirm the call reaches Connected and that audio/video work in both directions. Try mute, camera toggle, and End Call.
6. Repeat with the other account initiating. Also check Decline, missed-call timeout, and the offline recipient message.

The application code and backend signaling can be validated locally, but successful media depends on browser permissions, network reachability, and TURN configuration. Do not treat signaling-only tests as proof that audio/video works. A real device-to-device or browser-to-device media call still needs to be performed in the target deployment environment.

## API overview

- Public: `GET /api/health`, `POST /api/login`, `POST /api/register`.
- Authenticated discovery: `GET /api/users/discover` (also available at the authenticated legacy alias `GET /api/partners`). `GET /api/users` returns the same safe public user shape.
- Authenticated profile setup: `POST /api/onboard`.
- Authenticated messaging: `GET /api/messages/:userId/:partnerId`, `POST /api/messages`.
- Authenticated calling: `GET /api/rtc-config`, `GET /api/calls`; Socket.IO call events use the authenticated session and relay only between call participants.
- Other existing routes continue to provide onboarding, rooms, vocabulary, statistics, and reports.
