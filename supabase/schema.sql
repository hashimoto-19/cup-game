-- Run this in the Supabase SQL Editor after creating your project.

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memos_user_id_updated_at_idx
  on public.memos (user_id, updated_at desc);

alter table public.memos enable row level security;

create policy "Users can select own memos"
  on public.memos
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own memos"
  on public.memos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own memos"
  on public.memos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own memos"
  on public.memos
  for delete
  to authenticated
  using (auth.uid() = user_id);
