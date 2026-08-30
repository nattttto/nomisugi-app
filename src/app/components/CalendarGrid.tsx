"use client";

import { MODERATE_ALCOHOL_G, RISK_ALCOHOL_G_MALE } from "../lib/constants";
import { formatGrams } from "../lib/format";

interface DayTotal {
  drinks: number;
  alcoholG: number;
  sessions: number;
}

interface Props {
  /** "2026-08" */
  monthKey: string;
  totals: Map<string, DayTotal>;
  /** リスクの目安。性別によって変わるので呼び出し側から渡す */
  riskAlcoholG?: number;
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/** 純アルコール量の多さで色を変える。飲まなかった日はマスだけ置く */
function toneFor(alcoholG: number, riskG: number): string {
  if (alcoholG === 0) return "bg-slate-800/40 text-slate-600";
  if (alcoholG < MODERATE_ALCOHOL_G) return "bg-amber-400/20 text-amber-200";
  if (alcoholG < riskG) return "bg-amber-400/45 text-amber-100";
  return "bg-red-400/50 text-red-50";
}

export default function CalendarGrid({
  monthKey,
  totals,
  riskAlcoholG = RISK_ALCOHOL_G_MALE,
}: Props) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 月曜はじまりにそろえる（getDay は日曜=0）
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className={`text-center text-xs ${
              index === 5 ? "text-sky-400" : index === 6 ? "text-red-400" : "text-slate-500"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const dayNumber = index + 1;
          const dayKey = `${monthKey}-${String(dayNumber).padStart(2, "0")}`;
          const total = totals.get(dayKey);
          const alcoholG = total?.alcoholG ?? 0;

          return (
            <div
              key={dayKey}
              className={`flex aspect-square flex-col items-center justify-center rounded ${toneFor(
                alcoholG,
                riskAlcoholG,
              )}`}
              title={
                total
                  ? `${dayNumber}日：${total.drinks}杯 / ${formatGrams(alcoholG)}g`
                  : `${dayNumber}日：飲酒なし`
              }
            >
              <span className="tabular text-xs leading-none">{dayNumber}</span>
              {total && (
                <span className="tabular mt-0.5 text-[10px] leading-none opacity-80">
                  {total.drinks}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-800/40" />
          飲酒なし
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-400/20" />〜{MODERATE_ALCOHOL_G}g
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-400/45" />〜{riskAlcoholG}g
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-400/50" />
          {riskAlcoholG}g〜
        </span>
      </div>
    </div>
  );
}
