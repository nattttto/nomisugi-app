/**
 * 純アルコール量・カロリー・分解時間の計算。
 *
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import {
  ALCOHOL_METABOLISM_G_PER_KG_PER_HOUR,
  DEFAULT_WEIGHT_KG,
  ETHANOL_DENSITY,
  KCAL_PER_ALCOHOL_G,
} from "./constants";
import type { DrinkType } from "./drinks";

/**
 * 純アルコール量(g) = 量(mL) × 度数(%) / 100 × エタノールの比重(0.8)
 *
 * 種類の違うお酒を同じ土俵で比べるための、このアプリの内部単位。
 */
export function pureAlcoholGrams(volumeMl: number, abvPercent: number): number {
  return (volumeMl * abvPercent * ETHANOL_DENSITY) / 100;
}

/**
 * 1杯のカロリー(kcal)。
 *
 * 度数を手入力する「その他」は糖質が分からないので、アルコール分だけから計算する
 * （実際の飲み物はこれより高くなることはあっても低くはならない）。
 */
export function drinkCalories(
  drink: Pick<DrinkType, "kcalPer100ml" | "isCustom">,
  volumeMl: number,
  abvPercent: number,
): number {
  if (drink.isCustom) {
    return pureAlcoholGrams(volumeMl, abvPercent) * KCAL_PER_ALCOHOL_G;
  }
  return (volumeMl / 100) * drink.kcalPer100ml;
}

/** 1時間あたりに分解される純アルコール量(g)の目安 */
export function metabolismGramsPerHour(weightKg?: number | null): number {
  const weight = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  return weight * ALCOHOL_METABOLISM_G_PER_KG_PER_HOUR;
}

/** 指定した純アルコール量を分解し終わるまでの推定時間（ミリ秒） */
export function metabolismDurationMs(alcoholG: number, weightKg?: number | null): number {
  if (alcoholG <= 0) return 0;
  return (alcoholG / metabolismGramsPerHour(weightKg)) * 60 * 60 * 1000;
}

/**
 * 「いま体内に残っている純アルコール量」の推定。
 *
 * 飲んだ順に、次の1杯までの間に分解された分を引いていく。
 * 途中で0を下回ったら0で止める（分解しきってから飲み直した場合）。
 *
 * 吸収にかかる時間は考慮していない。飲んだ瞬間に体内に入ったものとして
 * 計算するので、飲み始め直後は多めに出る。
 */
export function remainingAlcoholG(
  drinks: { alcoholG: number; drankAtMs: number }[],
  nowMs: number,
  weightKg?: number | null,
): number {
  if (drinks.length === 0) return 0;
  const perMs = metabolismGramsPerHour(weightKg) / (60 * 60 * 1000);
  const sorted = [...drinks].sort((a, b) => a.drankAtMs - b.drankAtMs);

  let remaining = 0;
  let cursor = sorted[0].drankAtMs;
  for (const drink of sorted) {
    remaining = Math.max(0, remaining - (drink.drankAtMs - cursor) * perMs);
    remaining += drink.alcoholG;
    cursor = drink.drankAtMs;
  }
  return Math.max(0, remaining - (nowMs - cursor) * perMs);
}

/** 体内のアルコールが分解し終わると推定される時刻 */
export function estimatedSoberAt(
  drinks: { alcoholG: number; drankAtMs: number }[],
  nowMs: number,
  weightKg?: number | null,
): Date | null {
  const remaining = remainingAlcoholG(drinks, nowMs, weightKg);
  if (remaining <= 0) return null;
  return new Date(nowMs + metabolismDurationMs(remaining, weightKg));
}

/** ビール中ジョッキ（500mL・5%）1杯を1.0とした換算。杯数の目安表示に使う */
export const STANDARD_DRINK_G = pureAlcoholGrams(500, 5);
