# SentryHub — Architecture

The guiding principle: **build the alpha on the same primitives you'd run in
production**, so alpha → beta → live needs no re-platforming.

## Stack

| Layer | Choice | Why it scales without migration |
| --- | --- | --- |
| Frontend / API | Next.js 14 (App Router) on Vercel | Serverless; scales to zero and to spikes. Route Handlers are your API. |
| Auth | Supabase Auth | JWT sessions, refreshed in middleware. Same in prod. |
| Database | Supabase Postgres + RLS | RLS enforces ownership at the DB, not the app. Indexed for the queries we run. |
| Video | **Mux**, behind a `VideoProvider` interface | Transcode → adaptive HLS → global CDN. Handles 1 or 10M views identically. Live streaming later with no re-architecture. |
| Email | Resend | Transactional email; swap provider by editing one file. |
| Push | Web Push (VAPID) | Standards-based; no third-party push vendor lock-in. |

## Why the video layer is abstracted

`src/lib/video/` defines a provider-agnostic interface (`provider.ts`) and a Mux
implementation (`mux.ts`). The app — routes, components, DB columns — never
references Mux directly; it calls `getVideoProvider()`. Columns are generic
(`provider`, `upload_id`, `asset_id`, `playback_id`, `status`).

If you ever move to Cloudflare Stream, you implement the four methods in
`cloudflare.ts` and set `VIDEO_PROVIDER=cloudflare`. The app code doesn't change.
(Existing videos would need re-ingesting on the new provider; new uploads just work.)

## Upload flow (direct-to-provider, resumable)

```
Browser            Next.js API            Mux                Postgres
  |  POST /api/upload/create  |                               |
  |-------------------------->| insert video (uploading) ---->|
  |                           | + insert video_tags --------->|
  |                           | createUpload(passthrough=id)  |
  |                           |---------------------> upload   |
  |   { uploadUrl, videoId }  |<--- { id, url } --------------|
  |<--------------------------|                               |
  |  PUT file (UpChunk, chunked/resumable) ----> Mux          |
  |                                                            |
  |  PATCH status=processing ----------------------------->   |
  |                                                            |
  |              Mux finishes transcode                        |
  |   POST /api/webhooks/mux  (video.asset.ready)              |
  |                           | update playback_id,           |
  |                           | status=ready ---------------->|
  |                           |   (trigger fans out alerts)   |
```

The file never passes through our server — the browser uploads straight to Mux,
so our serverless functions stay cheap and fast regardless of file size.

## Notifications

Notifications are **created in the database by triggers** (no polling, no cron):

- `on_video_ready` — when a video flips to `ready`, insert `new_video` rows for
  every subscriber of any of its tags (deduped per user), gated by
  `notification_prefs.notify_new_video`.
- `on_comment_added` — notify the video owner (`notify_comments`).
- `on_like_added` — notify the video owner (`notify_likes`).

**Delivery** is decoupled: a Supabase **Database Webhook** on `INSERT` into
`public.notifications` POSTs the row to `/api/webhooks/notification`, which
fans out **email (Resend)** and **web push (VAPID)** to that user's devices.
This means in-app, email, and push share one source of truth and one wording
(`lib/notify/messages.ts`), and adding a channel (SMS, etc.) is one more call in
the dispatcher.

```
INSERT notifications --> Supabase DB Webhook --> /api/webhooks/notification
                                                   |-- email (Resend)
                                                   |-- push  (web-push -> devices)
```

## Security

- **RLS on every table**; users can only mutate their own rows. The taxonomy
  tables are read-only to clients.
- **Service-role key** is used only in webhook/dispatch routes (`lib/supabase/admin.ts`),
  never shipped to the browser.
- **Webhook auth**: Mux webhooks are signature-verified; the notification
  dispatcher requires a shared `x-webhook-secret`.

## Roles, feature flags, ads & analytics

**RBAC.** `profiles.role` is `user | moderator | admin`. SQL helpers
(`is_admin()`, `is_staff()`, `role_rank()`) back the RLS policies; the app mirrors
them in `lib/auth.ts`. A `guard_role_change` trigger blocks privilege escalation
even though users can edit their own profile row. Per-user `user_entitlements`
override the role default for a `feature_flags` key — `has_feature()` resolves the
effective value (explicit grant/block wins, else role ≥ the flag's `min_role`).

**Ads.** House ads live in `ad_campaigns` / `ads` (+ optional `ad_targets` for tag
targeting). `/api/ads` serves one weighted, targeted, in-window ad per placement
and honors the `no_ads` entitlement. `AdSlot` logs impression on render and click
on follow. Ad content is world-readable; only admins write it (RLS).

**Analytics.** A single append-only `events` table captures `video_view`,
`watch_progress`, `ad_impression`, `ad_click`. Ingest is via `/api/events` (works
anonymously; `sendBeacon` so it survives unload). Aggregation is done by
security-definer RPCs (`creator_overview`, `creator_video_breakdown`,
`admin_platform_overview`, `ad_overview`) that enforce ownership/role internally,
so dashboards never pull raw event rows. This scales: events are write-cheap and
indexed, and the rollup queries can be swapped for materialized views later
without touching the app.

## What you'd add for beta / live (no migration, just additions)

- Background thumbnail/preview customization (Mux already auto-generates).
- Rate limiting on upload + comment routes (e.g. Upstash).
- Moderation/reporting tables + admin views.
- Following *users* and a personalized feed.
- Email digests (batch the `new_video` notifications) via a scheduled function.
- Live streaming (Mux live) — same provider interface.
