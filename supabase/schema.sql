-- ========================================
-- メモ用テーブルと権限
-- Supabase の SQL Editor で一度実行する
-- ========================================

-- 1) メモを入れるテーブル
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),          -- メモID
  user_id uuid not null references auth.users (id) on delete cascade, -- 誰のメモか
  title text not null default '',                        -- タイトル
  body text not null default '',                         -- 本文
  created_at timestamptz not null default now(),         -- 作成日時
  updated_at timestamptz not null default now()          -- 更新日時
);

-- 2) 一覧を速くするための索引
create index if not exists memos_user_id_updated_at_idx
  on public.memos (user_id, updated_at desc);

-- 3) RLS（行レベルセキュリティ）をオン
--    → ポリシーを満たす行だけ見える／触れる
alter table public.memos enable row level security;

-- 4) ログインユーザーにテーブル操作を許可
--    （「Automatically expose new tables」オフのときに必要）
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.memos to authenticated;

-- 5) 「自分の行だけ」触れるポリシー
create policy "Users can select own memos"
  on public.memos for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own memos"
  on public.memos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own memos"
  on public.memos for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own memos"
  on public.memos for delete to authenticated
  using (auth.uid() = user_id);
