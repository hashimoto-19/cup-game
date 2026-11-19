/**
 * ログイン／新規登録画面。
 * Supabase Auth にメール＋パスワードを送る。
 */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import styles from "./page.module.css";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();

  // 画面の状態
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // ページリロードを止める
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    // ----- ログイン -----
    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
      return;
    }

    // ----- 新規登録 -----
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 確認メールの戻り先
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // メール確認オフなら、すぐセッションが付く
    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    // メール確認オンの場合
    setMessage(
      "確認メールを送りました。メール内のリンクを開いてからログインしてください。",
    );
    setLoading(false);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.brand}>メモ</h1>
          <p className={styles.tagline}>ログインして、メモをクラウドに残す</p>
        </div>

        {/* ログイン / 新規登録の切り替え */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === "login" ? styles.tabActive : styles.tab}
            onClick={() => {
              setMode("login");
              setError(null);
              setMessage(null);
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            className={mode === "signup" ? styles.tabActive : styles.tab}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
          >
            新規登録
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            メールアドレス
            <input
              className={styles.input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            パスワード
            <input
              className={styles.input}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
          {message ? <p className={styles.message}>{message}</p> : null}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading
              ? "処理中…"
              : mode === "login"
                ? "ログイン"
                : "アカウント作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
