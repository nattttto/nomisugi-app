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

/** 増減の矢印。飲酒量は「減った＝良い」なので、減少を mint にする */
function Delta({ value, unit }: { value: number; unit: string }) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-extrabold text-muted">
        <Minus className="h-3 w-3" strokeWidth={3} />
        変化なし
      </span>
    );
  }
  const decreased = rounded < 0;
  return (
    <span
      className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-extrabold text-ink ${
        decreased ? "bg-mint" : "bg-berry"
      }`}
    >
      {decreased ? (
        <ArrowDown className="h-3 w-3" strokeWidth={3} />
      ) : (
        <ArrowUp className="h-3 w-3" strokeWidth={3} />
      )}
      {Math.abs(rounded)}
      {unit}
    </span>
  );
}

/** 大きな数字1つぶん */
function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2.5">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd
        className={`tabular text-2xl font-extrabold ${accent ? "text-beer-deep" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
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
      <section className="sticker-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">
          📊 {year}年{month}月
        </h2>

        <dl className="grid grid-cols-2 gap-2">
          <Stat label="飲酒日数" value={`${current.drinkingDays} 日`} />
          <Stat label="飲酒回数" value={`${current.sessionCount} 回`} />
          <Stat label="総杯数" value={`${current.totalDrinks} 杯`} />
          <Stat label="純アルコール" value={`${formatGrams(current.totalAlcoholG)} g`} accent />
          <Stat label="推定カロリー" value={`${formatInt(current.totalCalories)}`} />
          <Stat label="1回あたり平均" value={`${current.avgDrinksPerSession.toFixed(1)} 杯`} />
          {current.maxDrinks > 0 && (
            <Stat label="1回の最大" value={`${current.maxDrinks} 杯`} />
          )}
          {current.totalCost > 0 && (
            <Stat label="飲酒費用" value={formatYen(current.totalCost)} />
          )}
        </dl>

        {current.goalSetCount > 0 && (
          <p className="mt-4 rounded-xl bg-mint px-3 py-2 text-center text-sm font-extrabold text-ink shadow-sticker">
            🎯 目標達成 {current.goalAchievedCount} / {current.goalSetCount} 回
          </p>
        )}
      </section>

      <section className="sticker-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">先月との比較</h2>
        {previous.sessionCount === 0 ? (
          <p className="text-sm font-bold text-muted">先月の記録がないので比べられません。</p>
        ) : (
          <ul className="space-y-3 text-sm font-extrabold">
            <li className="flex items-center justify-between">
              <span className="text-muted">飲酒日</span>
              <Delta value={diff.drinkingDays} unit="日" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">総杯数</span>
              <Delta value={diff.totalDrinks} unit="杯" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">純アルコール</span>
              <Delta value={diff.totalAlcoholG} unit="g" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">1回あたり平均</span>
              <Delta value={diff.avgDrinksPerSession} unit="杯" />
            </li>
          </ul>
        )}
      </section>

      <section className="sticker-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">カレンダー</h2>
        <CalendarGrid monthKey={monthKey} totals={totals} riskAlcoholG={riskAlcoholG} />
      </section>
    </div>
  );
}
