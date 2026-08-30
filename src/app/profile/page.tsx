"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, updateProfile } from "firebase/auth";
import { Loader2, LogOut } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { auth } from "../lib/firebase";
import { useCurrentUser } from "../lib/useCurrentUser";
import { patchUserProfile } from "../lib/firestoreUtils";
import { findUsernameByUid, validateDisplayName } from "../lib/username";
import { metabolismGramsPerHour } from "../lib/alcohol";
import { toStandardDrinks } from "../lib/warnings";
import {
  MEDICAL_DISCLAIMER,
  MODERATE_ALCOHOL_G,
  RISK_ALCOHOL_G_FEMALE,
  RISK_ALCOHOL_G_MALE,
} from "../lib/constants";
import type { Sex } from "../lib/types/firestore";

const SEX_LABELS: { value: Sex; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "unspecified", label: "未設定" },
];

/** 数値入力。空文字は「未設定」として null にする */
function toNumberOrNull(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, setProfile } = useCurrentUser();

  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sex, setSex] = useState<Sex>("unspecified");
  const [goalAlcohol, setGoalAlcohol] = useState("40");
  const [goalDrinks, setGoalDrinks] = useState("");
  const [warningsEnabled, setWarningsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setAge(profile.age?.toString() ?? "");
    setHeightCm(profile.heightCm?.toString() ?? "");
    setWeightKg(profile.weightKg?.toString() ?? "");
    setSex(profile.sex);
    setGoalAlcohol(profile.goal.alcoholGrams.toString());
    setGoalDrinks(profile.goal.drinks?.toString() ?? "");
    setWarningsEnabled(profile.settings.warningsEnabled);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void findUsernameByUid(user.uid).then(setUsername);
  }, [user]);

  async function handleSave() {
    if (!user || !profile) return;
    setMessage(null);
    setError(null);

    const invalid = validateDisplayName(displayName);
    if (invalid) {
      setError(invalid);
      return;
    }
    const goal = toNumberOrNull(goalAlcohol);
    if (goal === null) {
      setError("目標の純アルコール量を入力してください。");
      return;
    }

    setSaving(true);
    try {
      const patch = {
        displayName: displayName.trim(),
        age: toNumberOrNull(age),
        heightCm: toNumberOrNull(heightCm),
        weightKg: toNumberOrNull(weightKg),
        sex,
        goal: { alcoholGrams: goal, drinks: toNumberOrNull(goalDrinks) },
        settings: { ...profile.settings, warningsEnabled },
      };
      await patchUserProfile(user.uid, patch);
      // Auth 側の表示名もそろえる
      await updateProfile(user, { displayName: patch.displayName });
      setProfile({ ...profile, ...patch });
      setMessage("保存しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        読み込み中...
      </main>
    );
  }

  const riskG = sex === "female" ? RISK_ALCOHOL_G_FEMALE : RISK_ALCOHOL_G_MALE;
  const parsedWeight = toNumberOrNull(weightKg);
  const parsedGoal = toNumberOrNull(goalAlcohol);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-8">
      <h1 className="mb-6 text-2xl font-bold">👤 マイページ</h1>

      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-xs text-slate-500">ユーザーID（ログイン用・変更不可）</p>
        <p className="tabular mt-1 text-lg">{username ?? "—"}</p>
      </section>

      <section className="mb-4 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm text-slate-400">プロフィール</h2>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">ニックネーム</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">年齢</span>
            <input
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="任意"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">身長(cm)</span>
            <input
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="任意"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">体重(kg)</span>
            <input
              inputMode="numeric"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="任意"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          体重は分解時間の推定にだけ使います（現在の推定：1時間あたり約{" "}
          {metabolismGramsPerHour(parsedWeight).toFixed(1)}g）。
        </p>

        <div>
          <span className="mb-2 block text-sm text-slate-300">性別</span>
          <div className="flex gap-2">
            {SEX_LABELS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSex(option.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  sex === option.value
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-slate-700 bg-slate-950"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            リスクの目安の判定にだけ使います（現在：1日 {riskG}g 以上で注意表示）。
          </p>
        </div>
      </section>

      <section className="mb-4 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm text-slate-400">🎯 飲酒目標</h2>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">
            1回あたりの純アルコール量の上限(g)
          </span>
          <input
            inputMode="numeric"
            value={goalAlcohol}
            onChange={(e) => setGoalAlcohol(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          {parsedGoal !== null && (
            <span className="mt-1 block text-xs text-slate-500">
              ビール中ジョッキ 約 {toStandardDrinks(parsedGoal).toFixed(1)} 杯ぶん。
              「節度ある適度な飲酒」の目安は1日 {MODERATE_ALCOHOL_G}g とされています。
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">杯数の目安（任意）</span>
          <input
            inputMode="numeric"
            value={goalDrinks}
            onChange={(e) => setGoalDrinks(e.target.value)}
            placeholder="例：4"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          <span className="mt-1 block text-xs text-slate-500">
            杯数は補助的な表示です。達成の判定は純アルコール量で行います。
          </span>
        </label>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm text-slate-400">設定</h2>
        <label className="flex items-center justify-between">
          <span className="text-sm">飲み過ぎ・ペースの警告を出す</span>
          <input
            type="checkbox"
            checked={warningsEnabled}
            onChange={(e) => setWarningsEnabled(e.target.checked)}
            className="h-5 w-5 accent-amber-500"
          />
        </label>
      </section>

      {message && (
        <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        保存する
      </button>

      <p className="mb-6 text-xs leading-relaxed text-slate-500">{MEDICAL_DISCLAIMER}</p>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-slate-300"
      >
        <LogOut className="h-4 w-4" />
        ログアウト
      </button>

      <BottomNav />
    </main>
  );
}
