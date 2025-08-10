-- Ensure required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Utility trigger to keep updated_at current
create or replace function trigger_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

------------------------------------------
-- Withings tokens (no id column; user_id is PK)
------------------------------------------
create table if not exists public.withings_tokens (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_withings_tokens_user on public.withings_tokens(user_id);

drop trigger if exists trg_withings_tokens_set_updated_at on public.withings_tokens;
create trigger trg_withings_tokens_set_updated_at
before update on public.withings_tokens
for each row execute function trigger_set_timestamp();

alter table public.withings_tokens enable row level security;

-- Drop and recreate RLS policies (wrapped auth.uid() calls)
drop policy if exists "Users can view their Withings tokens"   on public.withings_tokens;
drop policy if exists "Users can insert Withings tokens"       on public.withings_tokens;
drop policy if exists "Users can update Withings tokens"       on public.withings_tokens;
drop policy if exists "Users can delete Withings tokens"       on public.withings_tokens;

create policy "Users can view their Withings tokens"
  on public.withings_tokens
  for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert Withings tokens"
  on public.withings_tokens
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update Withings tokens"
  on public.withings_tokens
  for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete Withings tokens"
  on public.withings_tokens
  for delete
  using ((select auth.uid()) = user_id);

------------------------------------------
-- Oura tokens (includes id + unique user_id)
------------------------------------------
create table if not exists public.oura_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_oura_tokens_user on public.oura_tokens(user_id);

drop trigger if exists trg_oura_tokens_set_updated_at on public.oura_tokens;
create trigger trg_oura_tokens_set_updated_at
before update on public.oura_tokens
for each row execute function trigger_set_timestamp();

alter table public.oura_tokens enable row level security;

-- Drop and recreate RLS policies
drop policy if exists "Users can view their Oura tokens" on public.oura_tokens;
drop policy if exists "Users can insert Oura tokens"     on public.oura_tokens;
drop policy if exists "Users can update Oura tokens"     on public.oura_tokens;

create policy "Users can view their Oura tokens"
  on public.oura_tokens
  for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert Oura tokens"
  on public.oura_tokens
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update Oura tokens"
  on public.oura_tokens
  for update
  using ((select auth.uid()) = user_id);
