"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { syntheticEmail, validateUsername } from "../lib/username";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // ログイン済みならホームへ戻す
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/home");
      else setChecking(false);
    });
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const invalid = validateUsername(username);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, syntheticEmail(username), password);
      router.replace("/home");
    } catch {
      // どちらが違うかは伝えない（存在するIDを総当たりで探せてしまうため）
      setError("ユーザーIDまたはパスワードが違います。");
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center font-bold text-muted">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-block -rotate-2 rounded-2xl bg-beer px-6 py-3 text-3xl font-extrabold tracking-widest text-ink shadow-pop">
            🍺 NOMISUGI
          </span>
          <p className="mt-5 font-bold text-muted">自分の飲み方を知る</p>
        </div>

        <form onSubmit={handleSubmit} className="sticker-card space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-extrabold">ユーザーID</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="sticker-field"
              placeholder="ryo_2026"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-extrabold">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="sticker-field"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="sticker-press flex w-full items-center justify-center gap-2 rounded-xl bg-beer px-4 py-3 text-lg font-extrabold text-ink disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            ログイン
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-muted">
          はじめての方は{" "}
          <Link href="/register" className="text-beer-deep underline">
            アカウント作成
          </Link>
        </p>
      </div>
    </main>
  );
}
