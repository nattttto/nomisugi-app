"use client";

import { CheckCircle2, X } from "lucide-react";
import { metabolismDurationMs, metabolismGramsPerHour } from "../lib/alcohol";
import { formatDuration, formatGrams, formatInt, formatTime, formatYen } from "../lib/format";
import { MEDICAL_DISCLAIMER } from "../lib/constants";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  session: DrinkingSession;
  weightKg: number | null;
  onClose: () => void;
}

/** 飲酒を終えたときのまとめ。目標を達成できた日は気持ちよく終われるようにする */
export default function SessionSummary({ session, weightKg, onClose }: Props) {
  const startAt = session.startAt.toDate();
  const endAt = session.endAt?.toDate() ?? new Date();
  const durationMs = Math.max(0, endAt.getTime() - startAt.getTime());

  // 飲んでいる間にも分解は進むので、その分を引いた残量から処理完了を見積もる
  const metabolizedDuringSession = metabolismGramsPerHour(weightKg) * (durationMs / 3600000);
  const remainingG = Math.max(0, session.totalAlcoholG - metabolizedDuringSession);
  const soberAt = new Date(endAt.getTime() + metabolismDurationMs(remainingG, weightKg));

  const goal = session.goalAlcoholG;
  const achieved = goal !== null && session.totalAlcoholG <= goal;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 px-4">
      <div className="pop-in max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-3xl border-[3px] border-ink bg-cream p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <span className="inline-block -rotate-1 rounded-xl bg-beer px-3 py-1.5 text-lg font-extrabold text-ink shadow-sticker">
            🎉 今日の飲酒終了
          </span>
          <button onClick={onClose} aria-label="閉じる" className="mt-1 text-muted">
            <X className="h-6 w-6" strokeWidth={3} />
          </button>
        </div>

        <dl className="space-y-2.5 rounded-2xl bg-paper p-4 text-sm font-bold shadow-sticker">
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted">飲酒時間</dt>
            <dd className="tabular text-right">
              {formatTime(startAt)} 〜 {formatTime(endAt)}（{formatDuration(durationMs)}）
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">合計</dt>
            <dd className="tabular">🍺 {session.totalDrinks} 杯</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">純アルコール</dt>
            <dd className="tabular text-beer-deep">{formatGrams(session.totalAlcoholG)} g</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">カロリー</dt>
            <dd className="tabular">{formatInt(session.totalCalories)} kcal</dd>
          </div>
          {session.waterCount > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">水</dt>
              <dd className="tabular">💧 {session.waterCount} 杯</dd>
            </div>
          )}
          {session.totalCost > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">金額</dt>
              <dd className="tabular">{formatYen(session.totalCost)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted">推定処理終了</dt>
            <dd className="tabular">{formatTime(soberAt)} 頃</dd>
          </div>
        </dl>

        {goal !== null && (
          <div
            className={`mt-4 rounded-2xl p-4 text-center text-ink shadow-sticker ${
              achieved ? "bg-mint" : "bg-paper"
            }`}
          >
            <p className="text-xs font-bold">🎯 今日の目標</p>
            <p className="tabular mt-0.5 text-sm font-bold">純アルコール {goal}g 以内</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-xl font-extrabold">
              {achieved ? (
                <>
                  <CheckCircle2 className="h-5 w-5" strokeWidth={3} />
                  達成！
                </>
              ) : (
                <span className="text-berry-deep">
                  {formatGrams(session.totalAlcoholG - goal)}g 超過
                </span>
              )}
            </p>
          </div>
        )}

        <p className="mt-4 text-xs font-bold leading-relaxed text-muted">{MEDICAL_DISCLAIMER}</p>

        <button
          onClick={onClose}
          className="sticker-press mt-4 w-full rounded-xl bg-beer px-4 py-3 text-lg font-extrabold text-ink"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
