import type { SupabaseClient } from "@supabase/supabase-js";

export type Memo = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  createdAt: number;
};

type MemoRow = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  created_at: string;
};

function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    updatedAt: new Date(row.updated_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listMemos(supabase: SupabaseClient): Promise<Memo[]> {
  const { data, error } = await supabase
    .from("memos")
    .select("id, title, body, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as MemoRow[]).map(toMemo);
}

export async function createMemo(
  supabase: SupabaseClient,
  partial?: Partial<Pick<Memo, "title" | "body">>,
): Promise<Memo> {
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

export async function updateMemo(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<Memo, "title" | "body">>,
): Promise<Memo> {
  const { data, error } = await supabase
    .from("memos")
    .update({
      ...("title" in patch ? { title: patch.title } : {}),
      ...("body" in patch ? { body: patch.body } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, title, body, updated_at, created_at")
    .single();

  if (error) throw error;
  return toMemo(data as MemoRow);
}

export async function deleteMemo(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw error;
}

export function formatUpdatedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
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

export function previewText(memo: Memo): string {
  const text = memo.body.trim() || memo.title.trim();
  if (!text) return "空のメモ";
  return text.length > 72 ? `${text.slice(0, 72)}…` : text;
}

export function translateMemoError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (message.toLowerCase().includes("jwt")) {
      return "セッションが切れました。再ログインしてください。";
    }
    return message;
  }
  return "操作に失敗しました。もう一度お試しください。";
}
