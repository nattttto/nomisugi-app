"use client";

import { useState } from "react";
import BarChart from "./BarChart";
import { monthlyBreakdown, summarizeSessions } from "../lib/stats";
import { formatGrams, formatInt, formatYen } from "../lib/format";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  /** その年のセッション */
  sessions: DrinkingSession[];
  year: number;
  onChangeYear: (year: number) => void;
}

type Metric = "sessions" | "drinks" | "alcohol";

const METRICS: { id: Metric; label: string }[] = [
  { id: "sessions", label: "飲酒回数" },
  { id: "drinks", label: "総杯数" },
  { id: "alcohol", label: "純アルコール" },
];

export default function YearlyStats({ sessions, year, onChangeYear }: Props) {
  const [metric, setMetric] = useState<Metric>("sessions");
  const summary = summarizeSessions(sessions);
  const months = monthlyBreakdown(sessions, year);

  const items = months.map(({ month, summary: monthSummary }) => {
    const value =
      metric === "sessions"
        ? monthSummary.sessionCount
        : metric === "drinks"
          ? monthSummary.totalDrinks
          : monthSummary.totalAlcoholG;
    return {
      label: `${month}月`,
      value,
      valueLabel:
        metric === "alcohol" ? `${formatGrams(value)}g` : String(Math.round(value)),
    };
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChangeYear(year - 1)}
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300"
        >
          ← {year - 1}
        </button>
        <span className="tabular text-lg font-bold">{year}年</span>
        <button
          onClick={() => onChangeYear(year + 1)}
          disabled={year >= currentYear}
          className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 disabled:opacity-30"
        >
          {year + 1} →
        </button>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-slate-500">飲酒回数</dt>
            <dd className="tabular text-2xl font-bold">{summary.sessionCount} 回</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">飲酒日数</dt>
            <dd className="tabular text-2xl font-bold">{summary.drinkingDays} 日</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">総杯数</dt>
            <dd className="tabular text-2xl font-bold">{summary.totalDrinks} 杯</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">純アルコール</dt>
            <dd className="tabular text-2xl font-bold text-amber-400">
              {summary.totalAlcoholG >= 1000
                ? `${(summary.totalAlcoholG / 1000).toFixed(1)} kg`
                : `${formatGrams(summary.totalAlcoholG)} g`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">推定カロリー</dt>
            <dd className="tabular text-lg font-bold">
              {formatInt(summary.totalCalories)} kcal
            </dd>
          </div>
          {summary.totalCost > 0 && (
            <div>
              <dt className="text-xs text-slate-500">飲酒費用</dt>
              <dd className="tabular text-lg font-bold">{formatYen(summary.totalCost)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex gap-2">
          {METRICS.map((option) => (
            <button
              key={option.id}
              onClick={() => setMetric(option.id)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                metric === option.id
                  ? "border-amber-400 bg-amber-400/10 text-amber-200"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <BarChart items={items} emptyMessage={`${year}年の記録はまだありません。`} />
      </section>
    </div>
  );
}
