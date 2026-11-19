-- permission denied for table memos が出たとき用
-- （schema.sql を最初から実行していれば不要）

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.memos to authenticated;
