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
  translateMemoError,
  updateMemo,
  type Memo,
} from "../lib/memos";

const SAVE_DEBOUNCE_MS = 400;

export default function MemoApp() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const pendingPatch = useRef<Partial<Pick<Memo, "title" | "body">> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        let rows = await listMemos(supabase);
        if (rows.length === 0) {
          const first = await createMemo(supabase, {
            title: "はじめてのメモ",
            body: "ここに思いついたことを書いてください。\n内容はクラウドに自動保存されます。",
          });
          rows = [first];
        }

        if (cancelled) return;
        setMemos(rows);
        setSelectedId(rows[0]?.id ?? null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(translateMemoError(err));
        setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memos;
    return memos.filter(
      (m) =>
        m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q),
    );
  }, [memos, query]);

  const selected = memos.find((m) => m.id === selectedId) ?? null;

  async function flushSave(id: string) {
    const patch = pendingPatch.current;
    pendingPatch.current = null;
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMemo(supabase, id, patch);
      setMemos((prev) =>
        prev
          .map((m) => (m.id === id ? updated : m))
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 900);
    } catch (err) {
      setError(translateMemoError(err));
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(id: string) {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      void flushSave(id);
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleCreate() {
    setError(null);
    try {
      if (selectedId && pendingPatch.current) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        await flushSave(selectedId);
      }
      const memo = await createMemo(supabase);
      setMemos((prev) => [memo, ...prev]);
      setSelectedId(memo.id);
      setQuery("");
    } catch (err) {
      setError(translateMemoError(err));
    }
  }

  function updateSelected(patch: Partial<Pick<Memo, "title" | "body">>) {
    if (!selectedId) return;
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    setMemos((prev) =>
      prev.map((m) =>
        m.id === selectedId
          ? { ...m, ...patch, updatedAt: Date.now() }
          : m,
      ),
    );
    scheduleSave(selectedId);
  }

  async function handleDelete() {
    if (!selectedId) return;
    setError(null);
    const id = selectedId;
    try {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      pendingPatch.current = null;
      await deleteMemo(supabase, id);
      const next = memos.filter((m) => m.id !== id);
      setMemos(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (err) {
      setError(translateMemoError(err));
    }
  }

  async function handleLogout() {
    if (selectedId && pendingPatch.current) {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      await flushSave(selectedId);
    }
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
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>メモ</h1>
          <p className={styles.tagline}>思いついたことを、すぐに残す</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => void handleLogout()}
          >
            ログアウト
          </button>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => void handleCreate()}
          >
            新しいメモ
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.searchWrap}>
            <input
              className={styles.search}
              type="search"
              placeholder="メモを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="メモを検索"
            />
          </div>

          {filtered.length === 0 ? (
            <p className={styles.emptyList}>
              {query ? "一致するメモがありません" : "メモがありません"}
            </p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((memo) => {
                const active = memo.id === selectedId;
                return (
                  <li key={memo.id}>
                    <button
                      type="button"
                      className={`${styles.listItem} ${active ? styles.listItemActive : ""}`}
                      onClick={() => {
                        if (
                          selectedId &&
                          selectedId !== memo.id &&
                          pendingPatch.current
                        ) {
                          if (saveTimer.current) {
                            window.clearTimeout(saveTimer.current);
                          }
                          void flushSave(selectedId);
                        }
                        setSelectedId(memo.id);
                      }}
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
                );
              })}
            </ul>
          )}
        </aside>

        <section className={styles.editor}>
          {selected ? (
            <>
              <div className={styles.editorTop}>
                <input
                  className={styles.titleInput}
                  value={selected.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="タイトル"
                  aria-label="メモのタイトル"
                />
              </div>
              <textarea
                className={styles.bodyInput}
                value={selected.body}
                onChange={(e) => updateSelected({ body: e.target.value })}
                placeholder="本文を書く…"
                aria-label="メモの本文"
              />
              <div className={styles.editorFooter}>
                <span className={error ? styles.statusError : styles.status}>
                  {error
                    ? error
                    : saving
                      ? "保存中…"
                      : savedFlash
                        ? "保存しました"
                        : `更新 ${formatUpdatedAt(selected.updatedAt)}`}
                </span>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => void handleDelete()}
                >
                  削除
                </button>
              </div>
            </>
          ) : (
            <p className={styles.emptyEditor}>
              左の一覧からメモを選ぶか、
              <br />
              「新しいメモ」を作成してください。
              {error ? (
                <>
                  <br />
                  <span className={styles.statusError}>{error}</span>
                </>
              ) : null}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
