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
