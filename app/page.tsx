/**
 * メモ画面（このアプリのメイン）。
 *
 * やっていること:
 * 1. ログイン確認
 * 2. メモ一覧を取得
 * 3. 選んで編集（少し待ってから自動保存）
 * 4. 新規作成・削除・ログアウト
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { createClient } from "../lib/supabase/client";
import {
  createMemo,
  deleteMemo,
  formatUpdatedAt,
  listMemos,
  previewText,
  updateMemo,
  type Memo,
} from "../lib/memos";

// 入力が止まってから何ミリ秒後に保存するか
const SAVE_WAIT_MS = 400;

export default function MemoApp() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // ----- 画面の状態 -----
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("読み込み中…");
  const [error, setError] = useState<string | null>(null);

  // 自動保存用タイマー
  const saveTimer = useRef<number | null>(null);

  // いま選んでいるメモ
  const selected = memos.find((m) => m.id === selectedId) ?? null;

  // 検索で絞り込んだ一覧
  const filtered = memos.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
    );
  });

  // ----- 最初の読み込み -----
  useEffect(() => {
    async function start() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 未ログインならログイン画面へ（proxy でも守っている）
        if (!user) {
          router.replace("/login");
          return;
        }

        let rows = await listMemos(supabase);

        // 1件も無いときは最初のメモを作る
        if (rows.length === 0) {
          const first = await createMemo(supabase, {
            title: "はじめてのメモ",
            body: "ここに書いてください。クラウドに自動保存されます。",
          });
          rows = [first];
        }

        setMemos(rows);
        setSelectedId(rows[0].id);
        setStatus(`更新 ${formatUpdatedAt(rows[0].updatedAt)}`);
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setReady(true);
      }
    }

    void start();
  }, [router, supabase]);

  // 画面を離れるときにタイマーを消す
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  // ----- クラウドへ保存 -----
  async function saveToCloud(id: string, title: string, body: string) {
    setStatus("保存中…");
    setError(null);
    try {
      const updated = await updateMemo(supabase, id, { title, body });
      setMemos((prev) =>
        prev
          .map((m) => (m.id === id ? updated : m))
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      setStatus("保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("保存に失敗しました");
    }
  }

  // 入力のたびに「少し待ってから保存」を予約
  function scheduleSave(id: string, title: string, body: string) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveToCloud(id, title, body);
    }, SAVE_WAIT_MS);
  }

  // タイトルや本文が変わったとき
  function onEdit(field: "title" | "body", value: string) {
    if (!selected) return;

    // 1. まず画面だけ更新（すぐ反映）
    const nextTitle = field === "title" ? value : selected.title;
    const nextBody = field === "body" ? value : selected.body;

    setMemos((prev) =>
      prev.map((m) =>
        m.id === selected.id
          ? { ...m, title: nextTitle, body: nextBody, updatedAt: Date.now() }
          : m,
      ),
    );

    // 2. 少し待ってからクラウドへ保存
    scheduleSave(selected.id, nextTitle, nextBody);
  }

  // ----- 新しいメモ -----
  async function onCreate() {
    setError(null);
    try {
      const memo = await createMemo(supabase);
      setMemos((prev) => [memo, ...prev]);
      setSelectedId(memo.id);
      setQuery("");
      setStatus("新しいメモを作成しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ----- 削除 -----
  async function onDelete() {
    if (!selected) return;
    setError(null);

    // 保存待ちがあればキャンセル
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    try {
      await deleteMemo(supabase, selected.id);
      const next = memos.filter((m) => m.id !== selected.id);
      setMemos(next);
      setSelectedId(next[0]?.id ?? null);
      setStatus(next[0] ? `更新 ${formatUpdatedAt(next[0].updatedAt)}` : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ----- ログアウト -----
  async function onLogout() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!ready) {
    return <div className={styles.loading}>読み込み中…</div>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.brand}>メモ</h1>
          <p className={styles.tagline}>思いついたことを、すぐに残す</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.logoutButton} onClick={onLogout}>
            ログアウト
          </button>
          <button type="button" className={styles.newButton} onClick={onCreate}>
            新しいメモ
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        {/* 左: 一覧 */}
        <aside className={styles.sidebar}>
          <div className={styles.searchWrap}>
            <input
              className={styles.search}
              type="search"
              placeholder="メモを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className={styles.emptyList}>
              {query ? "一致するメモがありません" : "メモがありません"}
            </p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((memo) => (
                <li key={memo.id}>
                  <button
                    type="button"
                    className={`${styles.listItem} ${
                      memo.id === selectedId ? styles.listItemActive : ""
                    }`}
                    onClick={() => setSelectedId(memo.id)}
                  >
                    <span className={styles.itemTitle}>
                      {memo.title.trim() || "無題のメモ"}
                    </span>
                    <span className={styles.itemPreview}>
                      {previewText(memo)}
                    </span>
                    <span className={styles.itemMeta}>
                      {formatUpdatedAt(memo.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 右: 編集 */}
        <section className={styles.editor}>
          {selected ? (
            <>
              <input
                className={styles.titleInput}
                value={selected.title}
                onChange={(e) => onEdit("title", e.target.value)}
                placeholder="タイトル"
              />
              <textarea
                className={styles.bodyInput}
                value={selected.body}
                onChange={(e) => onEdit("body", e.target.value)}
                placeholder="本文を書く…"
              />
              <div className={styles.editorFooter}>
                <span className={error ? styles.statusError : styles.status}>
                  {error ?? status}
                </span>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={onDelete}
                >
                  削除
                </button>
              </div>
            </>
          ) : (
            <p className={styles.emptyEditor}>
              左からメモを選ぶか、「新しいメモ」を押してください。
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
