"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { Beer, Loader2 } from "lucide-react";
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
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        読み込み中...
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Beer className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-widest text-amber-400">NOMISUGI</h1>
          <p className="mt-2 text-sm text-slate-400">自分の飲み方を知る</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">ユーザーID</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
              placeholder="ryo_2026"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            ログイン
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          はじめての方は{" "}
          <Link href="/register" className="text-amber-400 underline">
            アカウント作成
          </Link>
        </p>
      </div>
    </main>
  );
}
