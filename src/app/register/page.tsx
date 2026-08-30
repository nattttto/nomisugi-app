"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { Beer, Loader2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { saveUserProfile } from "../lib/firestoreUtils";
import {
  claimUsername,
  syntheticEmail,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "../lib/username";
import {
  DEFAULT_DAY_START_HOUR,
  DEFAULT_GOAL_ALCOHOL_G,
} from "../lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const invalid =
      validateUsername(username) ?? validateDisplayName(displayName) ?? validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    try {
      // 合成メールがIDから一意に決まるので、ID重複はここで弾かれる
      const credential = await createUserWithEmailAndPassword(
        auth,
        syntheticEmail(username),
        password,
      );
      await claimUsername(credential.user, username, displayName);
      await saveUserProfile({
        uid: credential.user.uid,
        displayName: displayName.trim(),
        createdAt: Timestamp.now(),
        age: null,
        heightCm: null,
        weightKg: null,
        sex: "unspecified",
        goal: { alcoholGrams: DEFAULT_GOAL_ALCOHOL_G, drinks: null },
        settings: { dayStartHour: DEFAULT_DAY_START_HOUR, warningsEnabled: true },
      });
      router.replace("/home");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "auth/email-already-in-use"
          ? "このユーザーIDは既に使われています。"
          : err instanceof Error
            ? err.message
            : "登録に失敗しました。",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Beer className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h1 className="text-2xl font-bold tracking-widest text-amber-400">アカウント作成</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">ユーザーID（ログイン用）</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
              placeholder="ryo_2026"
            />
            <span className="mt-1 block text-xs text-slate-500">
              英数字とアンダースコア 3〜20文字。あとから変更できません。
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">ニックネーム（表示名）</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
              placeholder="RYO"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
            />
            <span className="mt-1 block text-xs text-slate-500">
              6文字以上。メールアドレスを預からない仕組みのため、忘れた場合の自動再設定はできません。
            </span>
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
            登録する
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-amber-400 underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
