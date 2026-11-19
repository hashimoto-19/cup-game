/**
 * メモの CRUD（作成・読取・更新・削除）をまとめたファイル。
 * 実際のデータは Supabase の memos テーブルにある。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// 画面で使うメモの形
export type Memo = {
  id: string;
  title: string;
  body: string;
  updatedAt: number; // ミリ秒（Date.getTime()）
  createdAt: number;
};

// DB から返ってくる行の形（スネークケース）
type MemoRow = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  created_at: string;
};

// DB の行 → 画面用の形に変換
function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    updatedAt: new Date(row.updated_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** 自分のメモ一覧を新しい順で取得 */
export async function listMemos(supabase: SupabaseClient): Promise<Memo[]> {
  const { data, error } = await supabase
    .from("memos")
    .select("id, title, body, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as MemoRow[]).map(toMemo);
}

/** 新しいメモを1件作る */
export async function createMemo(
  supabase: SupabaseClient,
  partial?: { title?: string; body?: string },
): Promise<Memo> {
  // 誰のメモかを入れるため、今のユーザー ID を取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("ログインが必要です。");

  const { data, error } = await supabase
    .from("memos")
    .insert({
      user_id: user.id,
      title: partial?.title ?? "",
      body: partial?.body ?? "",
    })
    .select("id, title, body, updated_at, created_at")
    .single();

  if (error) throw error;
  return toMemo(data as MemoRow);
}

/** 既存メモのタイトル／本文を更新 */
export async function updateMemo(
  supabase: SupabaseClient,
  id: string,
  patch: { title?: string; body?: string },
): Promise<Memo> {
  // 送るデータだけを組み立てる（undefined は送らない）
  const dataToUpdate: {
    title?: string;
    body?: string;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) dataToUpdate.title = patch.title;
  if (patch.body !== undefined) dataToUpdate.body = patch.body;

  const { data, error } = await supabase
    .from("memos")
    .update(dataToUpdate)
    .eq("id", id)
    .select("id, title, body, updated_at, created_at")
    .single();

  if (error) throw error;
  return toMemo(data as MemoRow);
}

/** メモを1件削除 */
export async function deleteMemo(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
}

/** 更新時刻を見やすい文字にする */
export function formatUpdatedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

/** 一覧用の短いプレビュー文 */
export function previewText(memo: Memo): string {
  const text = memo.body.trim() || memo.title.trim();
  if (!text) return "空のメモ";
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}
