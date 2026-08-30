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

/**
 * 純アルコール量の多さで色を変える。
 * 塗りの上の文字はすべて ink（明るい色に白文字だとコントラストが落ちるため）。
 */
function toneFor(alcoholG: number, riskG: number): string {
  if (alcoholG === 0) return "bg-cream text-faint";
  if (alcoholG < MODERATE_ALCOHOL_G) return "bg-beer/40 text-ink";
  if (alcoholG < riskG) return "bg-beer text-ink";
  return "bg-berry text-ink";
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
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className={`text-center text-xs font-extrabold ${
              index === 5 ? "text-aqua-deep" : index === 6 ? "text-berry-deep" : "text-muted"
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
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border-[2px] border-ink font-extrabold ${toneFor(
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
                <span className="tabular mt-0.5 text-[10px] leading-none">{total.drinks}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] font-bold text-muted">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-[2px] border-ink bg-cream" />
          飲酒なし
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-[2px] border-ink bg-beer/40" />〜
          {MODERATE_ALCOHOL_G}g
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-[2px] border-ink bg-beer" />〜{riskAlcoholG}g
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border-[2px] border-ink bg-berry" />
          {riskAlcoholG}g〜
        </span>
      </div>
    </div>
  );
}
