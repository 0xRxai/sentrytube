-- =====================================================================
-- SentryHub database schema
-- Run this in the Supabase dashboard -> SQL Editor (paste + Run).
-- Safe to run on a fresh project.
-- =====================================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  bio          text,
  role         text not null default 'user' check (role in ('user','moderator','admin')),
  created_at   timestamptz not null default now()
);
-- (Upgrading from an older version that had an is_admin boolean?)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='is_admin') then
    update public.profiles set role = 'admin' where is_admin = true and role = 'user';
    alter table public.profiles drop column is_admin;
  end if;
end $$;

-- ---------- FEATURE FLAGS / ENTITLEMENTS ----------
-- A flag defines a feature and the minimum role that gets it by default.
-- An explicit entitlement grants (or revokes) it for a single user, overriding role.
create table if not exists public.feature_flags (
  key         text primary key,           -- e.g. 'upload', 'live_stream', 'beta'
  label       text not null,
  description text,
  min_role    text not null default 'user' check (min_role in ('user','moderator','admin'))
);

create table if not exists public.user_entitlements (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  flag_key text not null references public.feature_flags(key) on delete cascade,
  enabled  boolean not null default true,  -- explicit grant (true) or block (false)
  primary key (user_id, flag_key)
);

-- ---------- TAG TAXONOMY ----------
-- A category groups related tags, e.g. "Event type", "Vehicle", "Setting".
create table if not exists public.tag_categories (
  id    uuid primary key default gen_random_uuid(),
  slug  text unique not null,
  label text not null,
  sort  int not null default 0
);

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tag_categories(id) on delete cascade,
  slug        text unique not null,
  label       text not null
);
create index if not exists tags_category_idx on public.tags(category_id);

-- ---------- VIDEOS ----------
-- Media lives in the video provider (Mux). These columns are provider-agnostic
-- so the app never hard-codes Mux: a Cloudflare adapter populates the same fields.
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  provider      text not null default 'mux',
  upload_id     text,                 -- provider direct-upload id
  asset_id      text,                 -- provider asset id (set by webhook)
  playback_id   text,                 -- provider playback id (used by the player)
  status        text not null default 'uploading'
                  check (status in ('uploading','processing','ready','errored')),
  moderation_status text not null default 'active'
                  check (moderation_status in ('active','hidden','removed')),
  thumbnail_url text,                 -- optional override; otherwise derived from playback_id
  location      text,                 -- e.g. "Costco parking lot, Austin TX"
  event_date    date,
  duration_seconds int,
  view_count    bigint not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists videos_upload_idx on public.videos(upload_id);
create index if not exists videos_status_idx on public.videos(status);
create index if not exists videos_owner_idx on public.videos(owner_id);
create index if not exists videos_created_idx on public.videos(created_at desc);
create index if not exists videos_search_idx on public.videos
  using gin (to_tsvector('english',
    coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(location,'')));

-- many-to-many: which tags a video carries
create table if not exists public.video_tags (
  video_id uuid not null references public.videos(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (video_id, tag_id)
);
create index if not exists video_tags_tag_idx on public.video_tags(tag_id);

-- ---------- LIKES ----------
create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  video_id   uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- ---------- COMMENTS ----------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  is_removed boolean not null default false,  -- hidden by a moderator
  created_at timestamptz not null default now()
);
create index if not exists comments_video_idx on public.comments(video_id, created_at);

-- ---------- TAG SUBSCRIPTIONS ----------
-- A user follows a tag to be notified about new videos with that tag.
create table if not exists public.tag_subscriptions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
create index if not exists tag_subs_tag_idx on public.tag_subscriptions(tag_id);

-- ---------- NOTIFICATION PREFERENCES ----------
create table if not exists public.notification_prefs (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  notify_new_video     boolean not null default true,  -- new videos on subscribed tags
  notify_comments      boolean not null default true,  -- comments on my videos
  notify_likes         boolean not null default false  -- likes on my videos
);

-- ---------- NOTIFICATIONS ----------
-- type: 'new_video' | 'comment' | 'like'
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade, -- recipient
  type       text not null check (type in ('new_video','comment','like')),
  actor_id   uuid references public.profiles(id) on delete set null,         -- who triggered it
  video_id   uuid references public.videos(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  tag_id     uuid references public.tags(id) on delete set null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notif_unread_idx on public.notifications(user_id) where is_read = false;

-- ---------- WEB PUSH SUBSCRIPTIONS ----------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,   -- client public key
  auth       text not null,   -- client auth secret
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_user_idx on public.push_subscriptions(user_id);

-- ---------- REPORTS (moderation) ----------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('video','comment')),
  video_id    uuid references public.videos(id) on delete cascade,
  comment_id  uuid references public.comments(id) on delete cascade,
  reason      text not null,           -- e.g. 'illegal', 'harassment', 'spam', 'privacy', 'other'
  details     text,
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint report_target_ck check (
    (target_type = 'video'   and video_id is not null) or
    (target_type = 'comment' and comment_id is not null)
  )
);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
-- one open report per user per target
create unique index if not exists reports_unique_open_video
  on public.reports(reporter_id, video_id) where status = 'open' and target_type = 'video';
create unique index if not exists reports_unique_open_comment
  on public.reports(reporter_id, comment_id) where status = 'open' and target_type = 'comment';

-- =====================================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================================

-- Auto-create a profile + default prefs on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  insert into public.notification_prefs (user_id) values (new.id)
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent privilege escalation: only admins may change a profile's role.
-- (The "profiles update own" RLS policy lets users edit their own row, so this
-- trigger stops a user from setting their own role to admin via the API.)
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_change on public.profiles;
create trigger on_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- Atomic view increment.
create or replace function public.increment_view(p_video_id uuid)
returns void language sql as $$
  update public.videos set view_count = view_count + 1 where id = p_video_id;
$$;

-- Numeric rank for a role so we can compare "at least moderator", etc.
create or replace function public.role_rank(r text)
returns int language sql immutable as $$
  select case r when 'admin' then 3 when 'moderator' then 2 else 1 end;
$$;

-- Current user's role (defaults to 'user').
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user');
$$;

-- True if the current user is an admin.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role_name() = 'admin';
$$;

-- True if the current user is a moderator OR admin (staff).
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.role_rank(public.current_role_name()) >= 2;
$$;

-- True if the current user has access to a feature flag: explicit entitlement
-- wins; otherwise the user's role must meet the flag's min_role.
create or replace function public.has_feature(p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select enabled from public.user_entitlements
       where user_id = auth.uid() and flag_key = p_key),
    (select public.role_rank(public.current_role_name()) >= public.role_rank(ff.min_role)
       from public.feature_flags ff where ff.key = p_key),
    false
  );
$$;

-- When a video transitions to 'ready' (set by the provider webhook), notify
-- subscribers of any of its tags. Firing on "ready" (not on tag-insert) means
-- followers are only alerted once the video is actually playable, and only once
-- per user even if they follow several of the video's tags.
create or replace function public.notify_on_video_ready()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'ready' and coalesce(old.status, '') <> 'ready' then
    insert into public.notifications (user_id, type, actor_id, video_id, tag_id)
    select distinct on (s.user_id)
           s.user_id, 'new_video', new.owner_id, new.id, s.tag_id
    from public.tag_subscriptions s
    join public.video_tags vt on vt.tag_id = s.tag_id and vt.video_id = new.id
    left join public.notification_prefs p on p.user_id = s.user_id
    where s.user_id <> new.owner_id
      and coalesce(p.notify_new_video, true) = true
    order by s.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_video_ready on public.videos;
create trigger on_video_ready
  after update on public.videos
  for each row execute function public.notify_on_video_ready();

-- When someone comments, notify the video owner (if not the author).
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.videos where id = new.video_id;
  if v_owner is not null and v_owner <> new.author_id then
    if (select coalesce(notify_comments, true) from public.notification_prefs where user_id = v_owner) then
      insert into public.notifications (user_id, type, actor_id, video_id, comment_id)
      values (v_owner, 'comment', new.author_id, new.video_id, new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_added on public.comments;
create trigger on_comment_added
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- When someone likes, notify the video owner (if enabled and not self).
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.videos where id = new.video_id;
  if v_owner is not null and v_owner <> new.user_id then
    if (select coalesce(notify_likes, false) from public.notification_prefs where user_id = v_owner) then
      insert into public.notifications (user_id, type, actor_id, video_id)
      values (v_owner, 'like', new.user_id, new.video_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_like_added on public.likes;
create trigger on_like_added
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.tag_categories    enable row level security;
alter table public.tags              enable row level security;
alter table public.videos            enable row level security;
alter table public.video_tags        enable row level security;
alter table public.likes             enable row level security;
alter table public.comments          enable row level security;
alter table public.tag_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.notifications     enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reports           enable row level security;
alter table public.feature_flags     enable row level security;
alter table public.user_entitlements enable row level security;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
-- admins can update any profile (e.g. assign roles); role-escalation guard above
-- still applies, but is_admin() passes it.
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update using (public.is_admin());

-- feature_flags: world-readable; admins manage
drop policy if exists "flags read" on public.feature_flags;
create policy "flags read" on public.feature_flags for select using (true);
drop policy if exists "flags admin write" on public.feature_flags;
create policy "flags admin write" on public.feature_flags for all
  using (public.is_admin()) with check (public.is_admin());

-- user_entitlements: a user reads their own; admins read + manage all
drop policy if exists "entitlements read own or admin" on public.user_entitlements;
create policy "entitlements read own or admin" on public.user_entitlements
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "entitlements admin write" on public.user_entitlements;
create policy "entitlements admin write" on public.user_entitlements for all
  using (public.is_admin()) with check (public.is_admin());

-- tag taxonomy: world-readable, managed via SQL/admin only
drop policy if exists "tag_categories read" on public.tag_categories;
create policy "tag_categories read" on public.tag_categories for select using (true);
drop policy if exists "tags read" on public.tags;
create policy "tags read" on public.tags for select using (true);

-- videos: hide moderator-removed/hidden videos from everyone except the owner and admins
drop policy if exists "videos read" on public.videos;
create policy "videos read" on public.videos for select using (
  moderation_status = 'active' or owner_id = auth.uid() or public.is_staff()
);
drop policy if exists "videos insert own" on public.videos;
create policy "videos insert own" on public.videos for insert with check (auth.uid() = owner_id);
drop policy if exists "videos modify own" on public.videos;
create policy "videos modify own" on public.videos for update using (auth.uid() = owner_id);
drop policy if exists "videos delete own" on public.videos;
create policy "videos delete own" on public.videos for delete using (auth.uid() = owner_id);
-- staff can change moderation_status on any video
drop policy if exists "videos moderate" on public.videos;
create policy "videos moderate" on public.videos for update using (public.is_staff());

-- video_tags: readable; only the video owner can tag their videos
drop policy if exists "video_tags read" on public.video_tags;
create policy "video_tags read" on public.video_tags for select using (true);
drop policy if exists "video_tags insert own" on public.video_tags;
create policy "video_tags insert own" on public.video_tags for insert with check (
  exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid())
);
drop policy if exists "video_tags delete own" on public.video_tags;
create policy "video_tags delete own" on public.video_tags for delete using (
  exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid())
);

-- likes
drop policy if exists "likes read" on public.likes;
create policy "likes read" on public.likes for select using (true);
drop policy if exists "likes insert own" on public.likes;
create policy "likes insert own" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "likes delete own" on public.likes;
create policy "likes delete own" on public.likes for delete using (auth.uid() = user_id);

-- comments: removed comments hidden from everyone except their author and admins
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (
  is_removed = false or author_id = auth.uid() or public.is_staff()
);
drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "comments delete own" on public.comments;
create policy "comments delete own" on public.comments for delete using (auth.uid() = author_id);
-- staff can remove (hide) any comment
drop policy if exists "comments moderate" on public.comments;
create policy "comments moderate" on public.comments for update using (public.is_staff());

-- tag_subscriptions: users manage their own
drop policy if exists "subs read own" on public.tag_subscriptions;
create policy "subs read own" on public.tag_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "subs insert own" on public.tag_subscriptions;
create policy "subs insert own" on public.tag_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "subs delete own" on public.tag_subscriptions;
create policy "subs delete own" on public.tag_subscriptions for delete using (auth.uid() = user_id);

-- notification_prefs: users manage their own
drop policy if exists "prefs read own" on public.notification_prefs;
create policy "prefs read own" on public.notification_prefs for select using (auth.uid() = user_id);
drop policy if exists "prefs upsert own" on public.notification_prefs;
create policy "prefs upsert own" on public.notification_prefs for insert with check (auth.uid() = user_id);
drop policy if exists "prefs update own" on public.notification_prefs;
create policy "prefs update own" on public.notification_prefs for update using (auth.uid() = user_id);

-- notifications: recipient can read + mark read; inserts happen via triggers (security definer)
drop policy if exists "notif read own" on public.notifications;
create policy "notif read own" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notif update own" on public.notifications;
create policy "notif update own" on public.notifications for update using (auth.uid() = user_id);

-- push_subscriptions: users manage their own (the dispatcher reads them via service role)
drop policy if exists "push read own" on public.push_subscriptions;
create policy "push read own" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push insert own" on public.push_subscriptions;
create policy "push insert own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push delete own" on public.push_subscriptions;
create policy "push delete own" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- reports: a user can file reports and see their own; admins see + resolve all
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports read own or admin" on public.reports;
create policy "reports read own or admin" on public.reports
  for select using (auth.uid() = reporter_id or public.is_staff());
drop policy if exists "reports resolve admin" on public.reports;
create policy "reports resolve admin" on public.reports
  for update using (public.is_staff());

-- NOTE: media (video files, thumbnails) is stored in the video provider (Mux),
-- not in Supabase Storage, so no storage bucket is required for the alpha.
-- (Add an 'avatars' bucket later if you want user-uploaded profile pictures.)

-- =====================================================================
-- SEED TAG TAXONOMY
-- =====================================================================
insert into public.tag_categories (slug, label, sort) values
  ('event-type', 'Event type', 1),
  ('severity',   'Severity', 2),
  ('setting',    'Setting', 3),
  ('camera',     'Camera angle', 4)
on conflict (slug) do nothing;

-- event-type tags
insert into public.tags (category_id, slug, label)
select c.id, t.slug, t.label
from public.tag_categories c
join (values
  ('break-in',      'Break-in attempt'),
  ('hit-and-run',   'Hit and run'),
  ('vandalism',     'Vandalism'),
  ('theft',         'Theft'),
  ('road-rage',     'Road rage'),
  ('accident',      'Accident'),
  ('wildlife',      'Wildlife'),
  ('funny',         'Funny / wholesome')
) as t(slug, label) on c.slug = 'event-type'
on conflict (slug) do nothing;

insert into public.tags (category_id, slug, label)
select c.id, t.slug, t.label
from public.tag_categories c
join (values
  ('minor',    'Minor'),
  ('major',    'Major'),
  ('caught',   'Suspect caught')
) as t(slug, label) on c.slug = 'severity'
on conflict (slug) do nothing;

insert into public.tags (category_id, slug, label)
select c.id, t.slug, t.label
from public.tag_categories c
join (values
  ('parking-lot', 'Parking lot'),
  ('street',      'Street / curbside'),
  ('driveway',    'Driveway / home'),
  ('garage',      'Garage'),
  ('highway',     'Highway')
) as t(slug, label) on c.slug = 'setting'
on conflict (slug) do nothing;

insert into public.tags (category_id, slug, label)
select c.id, t.slug, t.label
from public.tag_categories c
join (values
  ('front',  'Front'),
  ('rear',   'Rear'),
  ('left',   'Left repeater'),
  ('right',  'Right repeater')
) as t(slug, label) on c.slug = 'camera'
on conflict (slug) do nothing;

-- =====================================================================
-- SEED FEATURE FLAGS
-- =====================================================================
insert into public.feature_flags (key, label, description, min_role) values
  ('upload',      'Upload videos',     'Can publish videos.', 'user'),
  ('comment',     'Comment',           'Can post comments.', 'user'),
  ('live_stream', 'Live streaming',    'Access to live streaming (beta).', 'admin'),
  ('beta',        'Beta features',     'Early access to in-progress features.', 'admin'),
  ('no_ads',      'Ad-free viewing',   'Hides house ads (e.g. supporters).', 'admin')
on conflict (key) do nothing;

-- =====================================================================
-- ANALYTICS (events) + ADVERTISING
-- =====================================================================

-- ---------- EVENTS ----------
-- One append-only row per tracked interaction. Aggregated by RPCs below.
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in
               ('video_view','watch_progress','ad_impression','ad_click')),
  user_id    uuid references public.profiles(id) on delete set null, -- null = anonymous
  video_id   uuid references public.videos(id) on delete cascade,
  ad_id      uuid,             -- references ads(id); set null handled at app level
  value      numeric,          -- e.g. seconds watched for watch_progress
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_video_type_idx on public.events(video_id, type);
create index if not exists events_ad_type_idx on public.events(ad_id, type);
create index if not exists events_created_idx on public.events(created_at);

-- ---------- ADVERTISING ----------
create table if not exists public.ad_campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  advertiser text,
  status     text not null default 'active' check (status in ('active','paused','ended')),
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ads (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  title       text not null,
  body        text,
  image_url   text,
  target_url  text not null,
  placement   text not null check (placement in ('feed','sidebar','preroll')),
  weight      int  not null default 1,   -- higher = served more often
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists ads_placement_idx on public.ads(placement, active);

-- Optional tag targeting: if an ad has rows here, it only shows on matching tags.
create table if not exists public.ad_targets (
  ad_id  uuid not null references public.ads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (ad_id, tag_id)
);

alter table public.events       enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ads          enable row level security;
alter table public.ad_targets   enable row level security;

-- events: anyone may log an event for themselves (or anonymously); reads are
-- restricted to staff and to creators reading their own videos' events.
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events for insert
  with check (user_id is null or user_id = auth.uid());
drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select using (
  public.is_staff()
  or exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid())
);

-- ad content is public (it's shown to everyone); only admins manage it.
drop policy if exists "ads read" on public.ads;
create policy "ads read" on public.ads for select using (true);
drop policy if exists "ads admin write" on public.ads;
create policy "ads admin write" on public.ads for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "campaigns read" on public.ad_campaigns;
create policy "campaigns read" on public.ad_campaigns for select using (true);
drop policy if exists "campaigns admin write" on public.ad_campaigns;
create policy "campaigns admin write" on public.ad_campaigns for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ad_targets read" on public.ad_targets;
create policy "ad_targets read" on public.ad_targets for select using (true);
drop policy if exists "ad_targets admin write" on public.ad_targets;
create policy "ad_targets admin write" on public.ad_targets for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- AGGREGATION RPCs ----------

-- Creator's overall totals (their own data only).
create or replace function public.creator_overview()
returns table(videos bigint, views bigint, watch_seconds bigint, likes bigint, comments bigint)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from videos v where v.owner_id = auth.uid()),
    (select count(*) from events e join videos v on v.id = e.video_id
        where v.owner_id = auth.uid() and e.type = 'video_view'),
    (select coalesce(sum(e.value),0)::bigint from events e join videos v on v.id = e.video_id
        where v.owner_id = auth.uid() and e.type = 'watch_progress'),
    (select count(*) from likes l join videos v on v.id = l.video_id where v.owner_id = auth.uid()),
    (select count(*) from comments c join videos v on v.id = c.video_id where v.owner_id = auth.uid());
$$;

-- Per-video breakdown for the current creator.
create or replace function public.creator_video_breakdown()
returns table(
  video_id uuid, title text, status text, moderation_status text,
  views bigint, watch_seconds bigint, likes bigint, comments bigint, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.title, v.status, v.moderation_status,
    (select count(*) from events e where e.video_id = v.id and e.type='video_view'),
    (select coalesce(sum(e.value),0)::bigint from events e where e.video_id = v.id and e.type='watch_progress'),
    (select count(*) from likes l where l.video_id = v.id),
    (select count(*) from comments c where c.video_id = v.id),
    v.created_at
  from videos v
  where v.owner_id = auth.uid()
  order by v.created_at desc;
$$;

-- Platform-wide overview (staff only).
create or replace function public.admin_platform_overview()
returns table(
  total_users bigint, total_videos bigint, total_views bigint,
  watch_seconds bigint, open_reports bigint, active_ads bigint
)
language sql stable security definer set search_path = public
as $$
  select
    case when public.is_staff() then (select count(*) from profiles) end,
    case when public.is_staff() then (select count(*) from videos) end,
    case when public.is_staff() then (select count(*) from events where type='video_view') end,
    case when public.is_staff() then (select coalesce(sum(value),0)::bigint from events where type='watch_progress') end,
    case when public.is_staff() then (select count(*) from reports where status='open') end,
    case when public.is_staff() then (select count(*) from ads where active) end;
$$;

-- Per-ad performance (admin only).
create or replace function public.ad_overview()
returns table(ad_id uuid, title text, placement text, impressions bigint, clicks bigint)
language sql stable security definer set search_path = public
as $$
  select a.id, a.title, a.placement,
    (select count(*) from events e where e.ad_id = a.id and e.type='ad_impression'),
    (select count(*) from events e where e.ad_id = a.id and e.type='ad_click')
  from ads a
  where public.is_admin()
  order by a.created_at desc;
$$;


-- (appended from migrations/20260924_social.sql — also run that file on existing DBs)
-- =====================================================================
-- Additive social layer (does NOT alter existing core tables).
-- Run in Supabase SQL Editor after the base schema.sql.
-- Safe / idempotent: create if not exists + drop/create policies.
-- =====================================================================

-- Follow creators (TikTok-style Following feed)
create table if not exists public.user_follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists user_follows_following_idx on public.user_follows(following_id);
create index if not exists user_follows_follower_idx on public.user_follows(follower_id);

alter table public.user_follows enable row level security;

drop policy if exists "follows read" on public.user_follows;
create policy "follows read" on public.user_follows for select using (true);

drop policy if exists "follows insert own" on public.user_follows;
create policy "follows insert own" on public.user_follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows delete own" on public.user_follows;
create policy "follows delete own" on public.user_follows
  for delete using (auth.uid() = follower_id);

-- Bookmarks / saves
create table if not exists public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  video_id   uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists bookmarks_video_idx on public.bookmarks(video_id);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks read own" on public.bookmarks;
create policy "bookmarks read own" on public.bookmarks
  for select using (auth.uid() = user_id);

drop policy if exists "bookmarks insert own" on public.bookmarks;
create policy "bookmarks insert own" on public.bookmarks
  for insert with check (auth.uid() = user_id);

drop policy if exists "bookmarks delete own" on public.bookmarks;
create policy "bookmarks delete own" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- Follower counts for profile UI (security definer so anon can read counts)
create or replace function public.profile_follow_counts(p_user_id uuid)
returns table (followers bigint, following bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.user_follows where following_id = p_user_id)::bigint,
    (select count(*) from public.user_follows where follower_id = p_user_id)::bigint;
$$;

grant execute on function public.profile_follow_counts(uuid) to anon, authenticated;
