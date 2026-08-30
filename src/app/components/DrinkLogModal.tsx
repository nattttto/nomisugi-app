"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { ChevronLeft, Loader2, X } from "lucide-react";
import { DRINK_TYPES, type DrinkType } from "../lib/drinks";
import { drinkCalories, metabolismDurationMs, pureAlcoholGrams } from "../lib/alcohol";
import { formatDuration, formatGrams, formatInt } from "../lib/format";
import type { DrinkRecord } from "../lib/types/firestore";

interface Props {
  weightKg: number | null;
  /** 現時点の合計。記録すると何がどう増えるかを出すために使う */
  currentAlcoholG: number;
  currentCalories: number;
  goalAlcoholG: number | null;
  onClose: () => void;
  onSubmit: (record: Omit<DrinkRecord, "id">) => Promise<void>;
}

export default function DrinkLogModal({
  weightKg,
  currentAlcoholG,
  currentCalories,
  goalAlcoholG,
  onClose,
  onSubmit,
}: Props) {
  const [drink, setDrink] = useState<DrinkType | null>(null);
  const [sizeId, setSizeId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [costText, setCostText] = useState("");
  const [customVolume, setCustomVolume] = useState("350");
  const [customAbv, setCustomAbv] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectDrink(next: DrinkType) {
    setDrink(next);
    setSizeId(next.sizes[Math.min(1, next.sizes.length - 1)].id);
    setQuantity(1);
    setError(null);
  }

  const size = drink?.sizes.find((s) => s.id === sizeId) ?? drink?.sizes[0];
  const volumeMl = drink?.isCustom ? Number(customVolume) || 0 : (size?.volumeMl ?? 0);
  const abvPercent = drink?.isCustom ? Number(customAbv) || 0 : (drink?.abvPercent ?? 0);

  const perDrinkAlcohol = pureAlcoholGrams(volumeMl, abvPercent);
  const perDrinkCalories = drink ? drinkCalories(drink, volumeMl, abvPercent) : 0;
  const addedAlcohol = perDrinkAlcohol * quantity;
  const addedCalories = perDrinkCalories * quantity;
  const addedTimeMs = metabolismDurationMs(addedAlcohol, weightKg);

  const nextTotalAlcohol = currentAlcoholG + addedAlcohol;
  const willExceedGoal = goalAlcoholG !== null && nextTotalAlcohol > goalAlcoholG;

  async function handleSubmit() {
    if (!drink || volumeMl <= 0 || abvPercent <= 0) {
      setError("量と度数を入力してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        drinkTypeId: drink.id,
        drinkLabel: drink.label,
        sizeLabel: drink.isCustom ? `${volumeMl}mL / ${abvPercent}%` : (size?.label ?? ""),
        volumeMl,
        abvPercent,
        quantity,
        alcoholG: addedAlcohol,
        calories: addedCalories,
        cost: costText.trim() === "" ? null : Number(costText) || 0,
        drankAt: Timestamp.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "記録に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center">
      <div className="pop-in max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t-[3px] border-ink bg-cream pb-[env(safe-area-inset-bottom)] sm:rounded-3xl sm:border-[3px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-ink bg-paper px-4 py-3">
          {drink ? (
            <button
              onClick={() => setDrink(null)}
              className="flex items-center text-sm font-extrabold text-muted"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
              種類を変える
            </button>
          ) : (
            <h2 className="text-lg font-extrabold">お酒を記録</h2>
          )}
          <button onClick={onClose} aria-label="閉じる" className="text-muted">
            <X className="h-6 w-6" strokeWidth={3} />
          </button>
        </header>

        {!drink ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {DRINK_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => selectDrink(type)}
                className="sticker-press flex flex-col items-center gap-1 rounded-2xl bg-paper px-3 py-5"
              >
                <span className="text-4xl">{type.emoji}</span>
                <span className="text-sm font-extrabold">{type.label}</span>
                {!type.isCustom && (
                  <span className="text-xs font-bold text-muted">約 {type.abvPercent}%</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-xl font-extrabold">
              <span className="text-3xl">{drink.emoji}</span>
              {drink.label}
            </div>
            {drink.note && (
              <p className="rounded-xl bg-paper px-3 py-2 text-xs font-bold leading-relaxed text-muted shadow-sticker">
                {drink.note}
              </p>
            )}

            {drink.isCustom ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-extrabold">量（mL）</span>
                  <input
                    inputMode="numeric"
                    value={customVolume}
                    onChange={(e) => setCustomVolume(e.target.value)}
                    className="sticker-field"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-extrabold">度数（%）</span>
                  <input
                    inputMode="decimal"
                    value={customAbv}
                    onChange={(e) => setCustomAbv(e.target.value)}
                    className="sticker-field"
                  />
                </label>
              </div>
            ) : (
              <div>
                <span className="mb-2 block text-sm font-extrabold">サイズ</span>
                <div className="space-y-2">
                  {drink.sizes.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSizeId(option.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left shadow-sticker ${
                        option.id === sizeId ? "bg-beer" : "bg-paper"
                      }`}
                    >
                      <span className="font-extrabold">{option.label}</span>
                      <span className="tabular shrink-0 text-xs font-bold">
                        {option.volumeMl}mL ／{" "}
                        {formatGrams(pureAlcoholGrams(option.volumeMl, drink.abvPercent))}g
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 shadow-sticker">
              <span className="text-sm font-extrabold">数量</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="sticker-press h-10 w-10 rounded-full bg-cream text-xl font-extrabold"
                  aria-label="減らす"
                >
                  −
                </button>
                <span className="tabular w-8 text-center text-2xl font-extrabold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  className="sticker-press h-10 w-10 rounded-full bg-cream text-xl font-extrabold"
                  aria-label="増やす"
                >
                  ＋
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold">金額（任意・円）</span>
              <input
                inputMode="numeric"
                value={costText}
                onChange={(e) => setCostText(e.target.value)}
                placeholder="未入力でもOK"
                className="sticker-field"
              />
            </label>

            {/* 記録すると何がどう増えるかを、押す前に見せる */}
            <div className="rounded-2xl bg-paper p-4 shadow-sticker">
              <p className="mb-3 text-sm font-extrabold text-muted">これを記録すると</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs font-bold text-muted">純アルコール</dt>
                  <dd className="tabular text-xl font-extrabold text-beer-deep">
                    +{formatGrams(addedAlcohol)}g
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-muted">カロリー</dt>
                  <dd className="tabular text-xl font-extrabold text-beer-deep">
                    +{formatInt(addedCalories)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-muted">処理時間</dt>
                  <dd className="tabular text-xl font-extrabold text-beer-deep">
                    +{formatDuration(addedTimeMs)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t-[3px] border-dotted border-ink/25 pt-3 text-xs font-bold text-muted">
                今日の合計 {formatGrams(nextTotalAlcohol)}g ／{" "}
                {formatInt(currentCalories + addedCalories)} kcal
                {willExceedGoal && (
                  <span className="ml-1 text-berry-deep">
                    （目標 {goalAlcoholG}g を超えます）
                  </span>
                )}
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="sticker-press flex w-full items-center justify-center gap-2 rounded-xl bg-beer px-4 py-3.5 text-lg font-extrabold text-ink disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              記録する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
