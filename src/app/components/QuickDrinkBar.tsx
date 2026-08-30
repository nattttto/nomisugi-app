"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { formatGrams } from "../lib/format";
import type { QuickDrink } from "../lib/quickDrinks";

interface Props {
  /** 直前に飲んだ1杯。まだ1杯も記録していなければ null */
  lastDrink: QuickDrink | null;
  /** よく飲むもの */
  frequent: QuickDrink[];
  onRecord: (drink: QuickDrink) => Promise<void>;
}

export default function QuickDrinkBar({ lastDrink, frequent, onRecord }: Props) {
  // 二重に押されないよう、処理中のキーを覚えておく
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const items: { drink: QuickDrink; badge: string | null }[] = [
    ...(lastDrink ? [{ drink: lastDrink, badge: "もう1杯" }] : []),
    ...frequent.map((drink) => ({ drink, badge: null })),
  ];
  if (items.length === 0) return null;

  async function handle(drink: QuickDrink) {
    if (busyKey) return;
    setBusyKey(drink.key);
    try {
      await onRecord(drink);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="sticker-card mb-4 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-muted">
        <Zap className="h-4 w-4" strokeWidth={3} />
        ワンタップで記録
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ drink, badge }, index) => (
          <button
            // 「もう1杯」と「よく飲む」で同じお酒が並ぶことがあるので、位置も鍵に混ぜる
            key={`${drink.key}-${index}`}
            onClick={() => void handle(drink)}
            disabled={busyKey !== null}
            // 1つしか出せないときに半分の幅で残ると押しにくいので、横いっぱいに広げる
            className={`sticker-press relative flex items-center gap-2 rounded-xl bg-cream px-3 py-3 text-left disabled:opacity-60 ${
              items.length === 1 ? "col-span-2" : ""
            }`}
          >
            {badge && (
              <span className="absolute -top-2 right-2 rounded-full bg-beer px-2 py-0.5 text-[10px] font-extrabold text-ink shadow-sticker">
                {badge}
              </span>
            )}
            <span className="text-2xl">
              {busyKey === drink.key ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                drink.emoji
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">{drink.label}</span>
              {/* サイズ名は省略してよいが、純アルコール量は切らさない */}
              <span className="flex items-baseline gap-1 text-xs font-bold text-muted">
                <span className="truncate">{drink.sizeLabel}</span>
                <span className="tabular shrink-0">{formatGrams(drink.alcoholG)}g</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
