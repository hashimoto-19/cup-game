# Supabase セットアップ（勉強用）

## やることの順番

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. **Settings → API Keys → Legacy API Keys** で次をコピー
   - Project URL（`https://xxxx.supabase.co`）
   - **anon public** キー（`eyJ` で始まるもの）
3. プロジェクト直下に `.env.local` を作る

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（anon public）
```

4. **SQL Editor** で `schema.sql` を全部実行
5. 開発を簡単にするなら  
   **Authentication → Sign In / Providers → Email** で Confirm email をオフ
6. `npm run dev` → http://localhost:3000/login

## よくあるつまずき

- `sb_publishable_...` ではなく **anon（eyJ...）** を使う
- `permission denied for table memos` → `schema.sql` の GRANT まで実行する
- `.env.local` を変えたら `npm run dev` をやり直す
