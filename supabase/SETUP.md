# Supabase セットアップ手順

1. [https://supabase.com](https://supabase.com) でアカウントを作成し、**New project** を作成する
2. **Project Settings → API** から次を控える
   - Project URL
   - anon public key
3. リポジトリ直下に `.env.local` を作り、次を記入する

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Supabase ダッシュボードの **SQL Editor** で [`schema.sql`](./schema.sql) の内容を実行する
5. （開発を簡単にする場合）**Authentication → Providers → Email** で  
   **Confirm email** をオフにすると、サインアップ直後にログインできる
6. `npm run dev` を起動し、http://localhost:3000/login でアカウントを作成する
