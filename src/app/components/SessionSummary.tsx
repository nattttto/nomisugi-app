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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="fade-up w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-lg font-bold">🎉 今日の飲酒終了</h2>
          <button onClick={onClose} aria-label="閉じる" className="text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">飲酒時間</dt>
            <dd className="tabular">
              {formatTime(startAt)} 〜 {formatTime(endAt)}（{formatDuration(durationMs)}）
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">合計</dt>
            <dd className="tabular">🍺 {session.totalDrinks} 杯</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">純アルコール</dt>
            <dd className="tabular text-amber-400">{formatGrams(session.totalAlcoholG)} g</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">カロリー</dt>
            <dd className="tabular">{formatInt(session.totalCalories)} kcal</dd>
          </div>
          {session.waterCount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-400">水</dt>
              <dd className="tabular">💧 {session.waterCount} 杯</dd>
            </div>
          )}
          {session.totalCost > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-400">金額</dt>
              <dd className="tabular">{formatYen(session.totalCost)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-400">推定処理終了</dt>
            <dd className="tabular">{formatTime(soberAt)} 頃</dd>
          </div>
        </dl>

        {goal !== null && (
          <div
            className={`mt-5 rounded-xl border p-4 text-center ${
              achieved
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-slate-700 bg-slate-800/50"
            }`}
          >
            <p className="text-xs text-slate-400">🎯 今日の目標</p>
            <p className="tabular mt-1 text-sm">純アルコール {goal}g 以内</p>
            <p
              className={`mt-2 flex items-center justify-center gap-1 font-bold ${
                achieved ? "text-emerald-300" : "text-slate-300"
              }`}
            >
              {achieved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  達成
                </>
              ) : (
                `${formatGrams(session.totalAlcoholG - goal)}g 超過`
              )}
            </p>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{MEDICAL_DISCLAIMER}</p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-amber-500 px-4 py-3 font-bold text-slate-950"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
