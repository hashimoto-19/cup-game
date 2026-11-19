/**
 * メール確認リンクなどを踏んだあと、
 * URL の code をセッション（ログイン状態）に交換する。
 */
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  // code があればログイン状態に交換してホームなどへ戻す
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${url.origin}${next}`);
    }
  }

  // 失敗したらログイン画面へ
  return NextResponse.redirect(`${url.origin}/login?error=auth`);
}
