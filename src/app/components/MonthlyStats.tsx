"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import {
  dailyTotals,
  diffSummaries,
  filterByMonth,
  previousMonthKey,
  summarizeSessions,
} from "../lib/stats";
import { formatGrams, formatInt, formatYen } from "../lib/format";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  /** 当月と前月を含むセッション */
  sessions: DrinkingSession[];
  monthKey: string;
  riskAlcoholG: number;
}

/** 増減の矢印。飲酒量は「減った＝良い」なので、減少を緑にする */
function Delta({ value, unit }: { value: number; unit: string }) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-slate-500">
        <Minus className="h-3 w-3" />
        変化なし
      </span>
    );
  }
  const decreased = rounded < 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${
        decreased ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {decreased ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
      {Math.abs(rounded)}
      {unit}
    </span>
  );
}

export default function MonthlyStats({ sessions, monthKey, riskAlcoholG }: Props) {
  const [year, month] = monthKey.split("-").map(Number);
  const current = summarizeSessions(filterByMonth(sessions, monthKey));
  const previous = summarizeSessions(filterByMonth(sessions, previousMonthKey(monthKey)));
  const diff = diffSummaries(current, previous);
  const totals = dailyTotals(filterByMonth(sessions, monthKey));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">
          📊 {year}年{month}月
        </h2>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-slate-500">飲酒日数</dt>
            <dd className="tabular text-2xl font-bold">{current.drinkingDays} 日</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">飲酒回数</dt>
            <dd className="tabular text-2xl font-bold">{current.sessionCount} 回</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">総杯数</dt>
            <dd className="tabular text-2xl font-bold">{current.totalDrinks} 杯</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">純アルコール</dt>
            <dd className="tabular text-2xl font-bold text-amber-400">
              {formatGrams(current.totalAlcoholG)} g
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">推定カロリー</dt>
            <dd className="tabular text-lg font-bold">
              {formatInt(current.totalCalories)} kcal
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">1回あたり平均</dt>
            <dd className="tabular text-lg font-bold">
              {current.avgDrinksPerSession.toFixed(1)} 杯
            </dd>
          </div>
          {current.maxDrinks > 0 && (
            <div>
              <dt className="text-xs text-slate-500">1回の最大</dt>
              <dd className="tabular text-lg font-bold">{current.maxDrinks} 杯</dd>
            </div>
          )}
          {current.totalCost > 0 && (
            <div>
              <dt className="text-xs text-slate-500">飲酒費用</dt>
              <dd className="tabular text-lg font-bold">{formatYen(current.totalCost)}</dd>
            </div>
          )}
        </dl>

        {current.goalSetCount > 0 && (
          <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-300">
            🎯 目標達成 {current.goalAchievedCount} / {current.goalSetCount} 回
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">先月との比較</h2>
        {previous.sessionCount === 0 ? (
          <p className="text-sm text-slate-500">先月の記録がないので比べられません。</p>
        ) : (
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-slate-400">飲酒日</span>
              <Delta value={diff.drinkingDays} unit="日" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">総杯数</span>
              <Delta value={diff.totalDrinks} unit="杯" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">純アルコール</span>
              <Delta value={diff.totalAlcoholG} unit="g" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-400">1回あたり平均</span>
              <Delta value={diff.avgDrinksPerSession} unit="杯" />
            </li>
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">カレンダー</h2>
        <CalendarGrid monthKey={monthKey} totals={totals} riskAlcoholG={riskAlcoholG} />
      </section>
    </div>
  );
}
