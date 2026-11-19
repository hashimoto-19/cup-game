# メモアプリ（勉強用）

Supabase にログインして、自分のメモだけを保存するアプリです。

## 全体の流れ

```
ブラウザ
  ↓
proxy.ts …… ログイン済みかチェック
  ↓
/login …… 新規登録・ログイン
  ↓
/ …… メモ一覧・編集（Supabase の memos テーブルへ保存）
```

## 主なファイル

| ファイル | 役割 |
|---|---|
| `app/page.tsx` | メモ画面（一覧・編集・削除） |
| `app/login/page.tsx` | ログイン／新規登録 |
| `lib/memos.ts` | メモの取得・作成・更新・削除 |
| `lib/supabase/client.ts` | ブラウザ用 Supabase 接続 |
| `lib/supabase/server.ts` | サーバー用 Supabase 接続 |
| `lib/supabase/proxy.ts` | 未ログインなら `/login` へ送る |
| `proxy.ts` | Next.js が各リクエスト前に呼ぶ入口 |
| `supabase/schema.sql` | DB テーブルと権限の定義 |
| `.env.local` | Supabase の URL と anon key |

## 起動

1. `.env.local` を用意する（`supabase/SETUP.md` 参照）
2. `supabase/schema.sql` を SQL Editor で実行する
3. `npm run dev`
4. http://localhost:3000/login
