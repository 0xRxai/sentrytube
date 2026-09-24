# SentryTube — cross-platform app (iOS · Android · Web)

One **Expo (React Native)** codebase that runs as a native iOS app, a native
Android app, and in the browser. TikTok-style vertical swipe feed + a grid browse
view. It talks to the **same Supabase + Mux backend** as the web project — no
backend changes.

## What's here

- **For You** — full-screen vertical swipe feed, autoplaying Mux HLS video, like / comment / view overlay.
- **Browse** — searchable grid of thumbnails (2 cols on phones, 4 on tablets/web).
- **Upload** — pick a video, publish via the backend's Mux upload endpoint.
- **Me** — profile + creator dashboard (views, likes, comments, your uploads), sign out.
- **Admin** — role-gated moderation queue (remove / dismiss reports) + **Analytics** (platform overview + ad performance). Appears only for moderators/admins.
- **Notifications** — native push (Expo) with tap-to-open, plus an in-app notifications list.
- **House ads** — sponsored cards served from Supabase (weighted + tag-targeted), with impression/click tracking.
- Auth (email/password) with session persistence via AsyncStorage.

## One-time DB migration

Native push uses Expo tokens (separate from the web's VAPID). Run
[`db/push_notifications.sql`](db/push_notifications.sql) once in the Supabase SQL
Editor to add the `device_tokens` table. The web backend's notification
dispatcher already sends Expo push to those tokens (see `src/lib/notify/expoPush.ts`
in the web project).

## Run it

Requires Node 18+ and the Expo tooling.

```bash
cd sentrytube-app
npm install
npx expo start
```

Then:
- **iOS:** press `i` (needs Xcode) or scan the QR code with the **Expo Go** app.
- **Android:** press `a` (needs Android Studio) or scan with **Expo Go**.
- **Web:** press `w` (opens http://localhost:8081).

> Expo Go is the fastest way to see it on a real phone — install it from the
> App Store / Play Store and scan the QR code that `expo start` prints.

## Configuration

Public config lives in `app.json → expo.extra`:

```json
"supabaseUrl":  "https://xcyqxqgmzeesduqerrmc.supabase.co",
"supabaseAnonKey": "sb_publishable_...",
"apiBaseUrl":   "https://sentrytube.com"
```

- `supabaseUrl` / `supabaseAnonKey` — the public Supabase creds. Reads (feed,
  browse, likes, comments, moderation) go **directly** to Supabase; Row Level
  Security keeps it safe. Only the anon/publishable key is in the app — never the
  service role.
- `apiBaseUrl` — your backend that holds the **Mux secret** (used only for
  creating uploads: `POST /api/upload/create`). The Next.js API routes from the
  web project serve this; point `apiBaseUrl` at wherever that's deployed. (Feed
  and playback work without it — only publishing needs it.)

## Architecture notes

- **Backend is 100% shared** with the web app: same tables, RLS, triggers, and
  RPCs (`creator_overview`, `creator_video_breakdown`, `increment_view`, …).
- **Moderation** is done directly against Supabase — staff RLS policies permit
  updating `videos.moderation_status` / `comments.is_removed` / `reports`, so the
  admin screen needs no server endpoint.
- **Video** plays Mux HLS (`https://stream.mux.com/<playbackId>.m3u8`) through a
  cross-platform `HlsVideo` component: `HlsVideo.tsx` uses `expo-av` on
  iOS/Android, and `HlsVideo.web.tsx` uses native HLS in Safari and **`hls.js`**
  in Chrome/Firefox/Edge — so the feed plays in **every** browser, matching
  native. (Feed autoplay is muted on web to satisfy browser autoplay policies.)

## Known follow-ups

- **DB:** run `db/20260924_social.sql` in Supabase (follows + bookmarks).
- **API:** deploy `../sentryhub` so `apiBaseUrl` answers `/api/health` + `/api/upload/create`.
- Web auth: if sign-up returns "Failed to fetch", switch `supabaseAnonKey` to the project's **legacy anon JWT** (`eyJ…`).
- Push: `eas init` for a project id; no-ops on simulators/web without it.
- See repo root `FIX_ORDER.md` for upgrade policy + ship order.

## TikTok feed actions

Like (tap / double-tap) · comments sheet · share · save · follow · tag filter ·
For You / Following · sound · report · infinite scroll.
