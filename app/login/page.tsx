"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import styles from "./page.module.css";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(translateAuthError(signInError.message));
        setLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setMessage(
      "確認メールを送信しました。メール内のリンクを開いてからログインしてください。",
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

        <div className={styles.tabs} role="tablist" aria-label="認証モード">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
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
            role="tab"
            aria-selected={mode === "signup"}
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
              autoComplete="email"
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
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

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (lower.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。";
  }
  if (lower.includes("password")) {
    return "パスワードは6文字以上で入力してください。";
  }
  if (lower.includes("email")) {
    return "メールアドレスの形式を確認してください。";
  }
  return message;
}
