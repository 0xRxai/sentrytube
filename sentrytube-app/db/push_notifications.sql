-- =====================================================================
-- Migration: Expo push device tokens
-- Run this once in the Supabase SQL Editor (it's additive + idempotent).
-- Native apps use Expo push tokens (different from the web's VAPID
-- subscriptions), so they get their own table.
-- =====================================================================

create table if not exists public.device_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,                 -- ExponentPushToken[...]
  platform   text,                          -- 'ios' | 'android' | 'web'
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

-- Users manage their own device tokens; the notification dispatcher reads them
-- via the service role (bypasses RLS).
drop policy if exists "device_tokens read own" on public.device_tokens;
create policy "device_tokens read own" on public.device_tokens
  for select using (auth.uid() = user_id);
drop policy if exists "device_tokens upsert own" on public.device_tokens;
create policy "device_tokens upsert own" on public.device_tokens
  for insert with check (auth.uid() = user_id);
drop policy if exists "device_tokens delete own" on public.device_tokens;
create policy "device_tokens delete own" on public.device_tokens
  for delete using (auth.uid() = user_id);
