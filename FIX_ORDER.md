# SentryTube — fix order & module upgrade policy

## Core (do not rewrite casually)

| Layer | Path | Role |
| --- | --- | --- |
| Database | `sentryhub/supabase/schema.sql` + `migrations/` | Source of truth. Prefer **additive** migrations. |
| Video | `sentryhub/src/lib/video/` | Provider interface; swap Mux↔Cloudflare via adapter only. |
| Auth | Supabase Auth + RLS | Cookie (web) **and** Bearer (Expo) via `lib/supabase/request.ts`. |
| Product UI | `sentrytube-app/` | **One** Expo app → iOS / Android / browser. |
| API | `sentryhub/src/app/api/` | Upload, webhooks, reports, events, push. Keep thin. |

Next.js pages in `sentryhub/src/app/` (non-`api`) are legacy/admin surfaces.
Prefer feature work in Expo so all platforms stay uniform.

## Proper fix / ship order

1. Run additive SQL: `supabase/migrations/20260924_social.sql` in Supabase SQL Editor.
2. Deploy **API** (`sentryhub`) via Git → Netlify (or Render) so `/api/health` and `/api/upload/create` are live.
3. Point Mux webhook + Supabase notification webhook at the deployed URL.
4. Set `sentrytube-app/app.json → extra.apiBaseUrl` to that URL.
5. If web signup fails with "Failed to fetch", swap anon key to Supabase **legacy JWT** (`eyJ…`).
6. `cd sentrytube-app && npm install && npx expo start` → `i` / `a` / `w`.
7. Optional: Resend `RESEND_API_KEY`, `eas init` for native push.

## Module upgrades

- Keep Expo SDK **pinned** (currently ~51). Upgrade with `npx expo install --fix` so
  `expo-*` packages stay on the SDK’s compatible set — do not freestyle major bumps.
- Next.js / Supabase / Mux: bump patch/minor freely; majors need a short adapter check
  under `src/lib/video` and `src/lib/supabase`.
- New product features = new files under `components/` / `lib/` / `app/` — avoid editing
  provider/auth cores unless the upgrade requires it.

## TikTok surface (Expo feed)

Like · double-tap like · comment sheet · share/forward · save · follow · tag filter ·
For You / Following · unmute · report · infinite scroll — all client modules on top of
existing `likes` / `comments` / `videos` tables + additive `user_follows` / `bookmarks`.
