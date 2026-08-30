"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { saveUserProfile } from "../lib/firestoreUtils";
import {
  claimUsername,
  syntheticEmail,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "../lib/username";
import { DEFAULT_DAY_START_HOUR, DEFAULT_GOAL_ALCOHOL_G } from "../lib/constants";

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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-block -rotate-2 rounded-2xl bg-beer px-5 py-2.5 text-2xl font-extrabold tracking-wider text-ink shadow-pop">
            アカウント作成
          </span>
        </div>

        <form onSubmit={handleSubmit} className="sticker-card space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-extrabold">
              ユーザーID（ログイン用）
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="sticker-field"
              placeholder="ryo_2026"
            />
            <span className="mt-1.5 block text-xs font-bold text-muted">
              英数字とアンダースコア 3〜20文字。あとから変更できません。
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-extrabold">
              ニックネーム（表示名）
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="sticker-field"
              placeholder="RYO"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-extrabold">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="sticker-field"
            />
            <span className="mt-1.5 block text-xs font-bold text-muted">
              6文字以上。メールアドレスを預からない仕組みのため、忘れた場合の自動再設定はできません。
            </span>
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
            登録する
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-muted">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-beer-deep underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
