/**
 * サーバー側（Route Handler など）から Supabase に接続するためのクライアント。
 * ログイン状態は Cookie に入っているので、それを読み書きする。
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Cookie を全部読む
        getAll() {
          return cookieStore.getAll();
        },
        // Cookie を書き戻す（できない場所では何もしない）
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component からは書けないことがある
          }
        },
      },
    },
  );
}
