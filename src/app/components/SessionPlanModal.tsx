"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Loader2, X } from "lucide-react";
import { toStandardDrinks } from "../lib/warnings";
import { formatTime } from "../lib/format";
import { MODERATE_ALCOHOL_G } from "../lib/constants";
import type { SessionMode, SessionPlan } from "../lib/types/firestore";

interface Props {
  /** プロフィールに設定してある目標。既定値に使う */
  defaultGoalAlcoholG: number;
  onClose: () => void;
  onStart: (plan: SessionPlan, goalAlcoholG: number) => Promise<void>;
}

const MODES: { id: SessionMode; emoji: string; label: string; note: string }[] = [
  { id: "solo", emoji: "🏠", label: "ふだんの晩酌", note: "いつもの目標で" },
  { id: "party", emoji: "🍻", label: "飲み会", note: "終わりの時刻から配分する" },
];

/** よく使う上限。ビール中ジョッキ換算で 1／2／3 杯ぶんあたり */
const GOAL_PRESETS = [20, 40, 60];

/**
 * 「HH:MM」を今日か明日の日時に直す。
 *
 * 飲み会の終わりは 0時や1時になることが多い。いま 22時に「01:00」と入れたら
 * 翌日の1時を指しているので、過ぎている時刻は翌日として解釈する。
 */
export function resolveEndBy(timeText: string, now: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const end = new Date(now);
  end.setHours(hour, minute, 0, 0);
  if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 1);
  return end;
}

export default function SessionPlanModal({ defaultGoalAlcoholG, onClose, onStart }: Props) {
  const [mode, setMode] = useState<SessionMode>("solo");
  const [goalText, setGoalText] = useState(String(defaultGoalAlcoholG));
  const [endByText, setEndByText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goal = Number(goalText);
  const goalValid = Number.isFinite(goal) && goal > 0;
  const endBy = resolveEndBy(endByText, new Date());

  async function handleStart() {
    if (!goalValid) {
      setError("今日の上限を入力してください。");
      return;
    }
    if (endByText.trim() !== "" && endBy === null) {
      setError("終わりの時刻は 23:30 のような形式で入力してください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onStart(
        { mode, endBy: endBy ? Timestamp.fromDate(endBy) : null },
        goal,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "開始に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center">
      <div className="pop-in max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t-[3px] border-ink bg-cream pb-[env(safe-area-inset-bottom)] sm:rounded-3xl sm:border-[3px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-ink bg-paper px-4 py-3">
          <h2 className="text-lg font-extrabold">今日の飲み方</h2>
          <button onClick={onClose} aria-label="閉じる" className="text-muted">
            <X className="h-6 w-6" strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((option) => (
              <button
                key={option.id}
                onClick={() => setMode(option.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-4 shadow-sticker ${
                  mode === option.id ? "bg-beer" : "bg-paper"
                }`}
              >
                <span className="text-3xl">{option.emoji}</span>
                <span className="text-sm font-extrabold">{option.label}</span>
                <span className="text-xs font-bold text-muted">{option.note}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-paper p-4 shadow-sticker">
            <span className="mb-2 block text-sm font-extrabold">今日の上限（純アルコール g）</span>
            <div className="mb-3 flex gap-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGoalText(String(preset))}
                  className={`flex-1 rounded-xl px-2 py-2 text-xs font-extrabold shadow-sticker ${
                    Number(goalText) === preset ? "bg-beer" : "bg-cream text-muted"
                  }`}
                >
                  {preset}g
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              className="sticker-field"
            />
            <p className="mt-2 text-xs font-bold leading-relaxed text-muted">
              {goalValid
                ? `ビール中ジョッキ 約 ${toStandardDrinks(goal).toFixed(1)} 杯ぶん。`
                : "数字を入力してください。"}
              「節度ある適度な飲酒」の目安は1日 {MODERATE_ALCOHOL_G}g とされています。
            </p>
            {mode === "party" && (
              <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs font-bold leading-relaxed text-muted">
                飲み会の日は、いつもの目標を無理に守るより、実際に飲む量に近い上限を
                置いたほうが記録も介入も続きます。
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-paper p-4 shadow-sticker">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold">
                何時までにする？（任意）
              </span>
              <input
                type="time"
                value={endByText}
                onChange={(e) => setEndByText(e.target.value)}
                className="sticker-field"
              />
            </label>
            <p className="mt-2 text-xs font-bold leading-relaxed text-muted">
              {endBy
                ? `${formatTime(endBy)} まで。残りの時間と上限から、1杯あたり空けたい間隔を出します。`
                : "入れておくと、終わりまでのペース配分を出せます。深夜の時刻は翌日として扱います。"}
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
              {error}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={submitting}
            className="sticker-press flex w-full items-center justify-center gap-2 rounded-xl bg-beer px-4 py-3.5 text-lg font-extrabold text-ink disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            この計画ではじめる
          </button>
        </div>
      </div>
    </div>
  );
}
