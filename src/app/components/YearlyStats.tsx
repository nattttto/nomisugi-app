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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2.5">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className={`tabular text-2xl font-extrabold ${accent ? "text-beer-deep" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

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
      valueLabel: metric === "alcohol" ? `${formatGrams(value)}g` : String(Math.round(value)),
    };
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onChangeYear(year - 1)}
          className="sticker-press rounded-xl bg-paper px-3 py-1.5 text-sm font-extrabold"
        >
          ← {year - 1}
        </button>
        <span className="tabular text-lg font-extrabold">{year}年</span>
        <button
          onClick={() => onChangeYear(year + 1)}
          disabled={year >= currentYear}
          className="sticker-press rounded-xl bg-paper px-3 py-1.5 text-sm font-extrabold disabled:opacity-30"
        >
          {year + 1} →
        </button>
      </div>

      <section className="sticker-card p-5">
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="飲酒回数" value={`${summary.sessionCount} 回`} />
          <Stat label="飲酒日数" value={`${summary.drinkingDays} 日`} />
          <Stat label="総杯数" value={`${summary.totalDrinks} 杯`} />
          <Stat
            label="純アルコール"
            value={
              summary.totalAlcoholG >= 1000
                ? `${(summary.totalAlcoholG / 1000).toFixed(1)} kg`
                : `${formatGrams(summary.totalAlcoholG)} g`
            }
            accent
          />
          <Stat label="推定カロリー" value={formatInt(summary.totalCalories)} />
          {summary.totalCost > 0 && (
            <Stat label="飲酒費用" value={formatYen(summary.totalCost)} />
          )}
        </dl>
      </section>

      <section className="sticker-card p-5">
        <div className="mb-4 flex gap-2">
          {METRICS.map((option) => (
            <button
              key={option.id}
              onClick={() => setMetric(option.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-extrabold shadow-sticker ${
                metric === option.id ? "bg-beer text-ink" : "bg-cream text-muted"
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
