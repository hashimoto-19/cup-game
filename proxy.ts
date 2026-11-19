/**
 * Next.js 16 の入口（旧 middleware）。
 * ほぼすべてのページアクセスの前に、ログイン確認を走らせる。
 */
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// 画像や Next の内部ファイルはチェックしない
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
