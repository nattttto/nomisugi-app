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
      <main className="flex min-h-dvh items-center justify-center font-bold text-muted">
        読み込み中...
      </main>
    );
  }

  const riskG = sex === "female" ? RISK_ALCOHOL_G_FEMALE : RISK_ALCOHOL_G_MALE;
  const parsedWeight = toNumberOrNull(weightKg);
  const parsedGoal = toNumberOrNull(goalAlcohol);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-32 pt-8">
      <h1 className="mb-5">
        <span className="inline-block -rotate-2 rounded-xl bg-beer px-4 py-2 text-xl font-extrabold text-ink shadow-pop">
          👤 マイページ
        </span>
      </h1>

      <section className="sticker-card mb-4 p-5">
        <p className="text-xs font-bold text-muted">ユーザーID（ログイン用・変更不可）</p>
        <p className="tabular mt-1 text-lg font-extrabold">{username ?? "—"}</p>
      </section>

      <section className="sticker-card mb-4 space-y-4 p-5">
        <h2 className="text-sm font-extrabold text-muted">プロフィール</h2>

        <label className="block">
          <span className="mb-1.5 block text-sm font-extrabold">ニックネーム</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="sticker-field"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold">年齢</span>
            <input
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="任意"
              className="sticker-field px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold">身長(cm)</span>
            <input
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="任意"
              className="sticker-field px-3"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold">体重(kg)</span>
            <input
              inputMode="numeric"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="任意"
              className="sticker-field px-3"
            />
          </label>
        </div>
        <p className="text-xs font-bold leading-relaxed text-muted">
          体重は分解時間の推定にだけ使います（現在の推定：1時間あたり約{" "}
          {metabolismGramsPerHour(parsedWeight).toFixed(1)}g）。
        </p>

        <div>
          <span className="mb-2 block text-sm font-extrabold">性別</span>
          <div className="flex gap-2">
            {SEX_LABELS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSex(option.value)}
                className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-extrabold shadow-sticker ${
                  sex === option.value ? "bg-beer" : "bg-cream"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-bold leading-relaxed text-muted">
            リスクの目安の判定にだけ使います（現在：1日 {riskG}g 以上で注意表示）。
          </p>
        </div>
      </section>

      <section className="sticker-card mb-4 space-y-4 p-5">
        <h2 className="text-sm font-extrabold text-muted">🎯 飲酒目標</h2>

        <label className="block">
          <span className="mb-1.5 block text-sm font-extrabold">
            1回あたりの純アルコール量の上限(g)
          </span>
          <input
            inputMode="numeric"
            value={goalAlcohol}
            onChange={(e) => setGoalAlcohol(e.target.value)}
            className="sticker-field"
          />
          {parsedGoal !== null && (
            <span className="mt-1.5 block text-xs font-bold leading-relaxed text-muted">
              ビール中ジョッキ 約 {toStandardDrinks(parsedGoal).toFixed(1)} 杯ぶん。
              「節度ある適度な飲酒」の目安は1日 {MODERATE_ALCOHOL_G}g とされています。
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-extrabold">杯数の目安（任意）</span>
          <input
            inputMode="numeric"
            value={goalDrinks}
            onChange={(e) => setGoalDrinks(e.target.value)}
            placeholder="例：4"
            className="sticker-field"
          />
          <span className="mt-1.5 block text-xs font-bold leading-relaxed text-muted">
            杯数は補助的な表示です。達成の判定は純アルコール量で行います。
          </span>
        </label>
      </section>

      <section className="sticker-card mb-4 p-5">
        <h2 className="mb-3 text-sm font-extrabold text-muted">設定</h2>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold">飲み過ぎ・ペースの警告を出す</span>
          <input
            type="checkbox"
            checked={warningsEnabled}
            onChange={(e) => setWarningsEnabled(e.target.checked)}
            className="h-6 w-6 shrink-0 accent-beer"
          />
        </label>
      </section>

      {message && (
        <p className="mb-3 rounded-xl bg-mint px-3 py-2 text-sm font-bold text-ink shadow-sticker">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="sticker-press mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-beer px-4 py-3.5 text-lg font-extrabold text-ink disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        保存する
      </button>

      <p className="mb-5 text-xs font-bold leading-relaxed text-muted">{MEDICAL_DISCLAIMER}</p>

      <button
        onClick={handleSignOut}
        className="sticker-press flex w-full items-center justify-center gap-2 rounded-xl bg-paper px-4 py-3 font-extrabold text-ink"
      >
        <LogOut className="h-4 w-4" strokeWidth={3} />
        ログアウト
      </button>

      <BottomNav />
    </main>
  );
}
