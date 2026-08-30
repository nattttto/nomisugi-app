/**
 * ワンタップ記録。
 *
 * 記録が続くかどうかでこのアプリの価値は決まる。
 * 「記録ボタン → 種類 → サイズ → 記録」の3タップは、酔っている状態では重い。
 * よく飲むものと直前に飲んだものは、1タップで入るようにする。
 *
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import { drinkCalories, pureAlcoholGrams } from "./alcohol";
import { findDrinkType, type DrinkTypeId } from "./drinks";
import type { DrinkRecord } from "./types/firestore";

export interface QuickDrink {
  /** 画面上でボタンを見分けるための識別子 */
  key: string;
  /**
   * drinkCounts に積むキー。
   * 量と度数を手入力した1杯は「種類:サイズ」に戻せないので null。
   */
  countKey: string | null;
  drinkTypeId: DrinkTypeId;
  sizeId: string;
  emoji: string;
  label: string;
  sizeLabel: string;
  volumeMl: number;
  abvPercent: number;
  /** 1杯ぶん */
  alcoholG: number;
  calories: number;
}

export function drinkCountKey(drinkTypeId: string, sizeId: string): string {
  return `${drinkTypeId}:${sizeId}`;
}

/**
 * 「種類:サイズ」から1杯ぶんの中身を組み立てる。
 *
 * 量と度数を手入力する「その他」は、キーだけでは元の1杯を復元できないので対象外。
 */
export function buildQuickDrink(drinkTypeId: string, sizeId: string): QuickDrink | null {
  const drink = findDrinkType(drinkTypeId);
  if (!drink || drink.isCustom) return null;
  const size = drink.sizes.find((s) => s.id === sizeId);
  if (!size) return null;

  return {
    key: drinkCountKey(drink.id, size.id),
    countKey: drinkCountKey(drink.id, size.id),
    drinkTypeId: drink.id,
    sizeId: size.id,
    emoji: drink.emoji,
    label: drink.label,
    sizeLabel: size.label,
    volumeMl: size.volumeMl,
    abvPercent: drink.abvPercent,
    alcoholG: pureAlcoholGrams(size.volumeMl, drink.abvPercent),
    calories: drinkCalories(drink, size.volumeMl, drink.abvPercent),
  };
}

/**
 * よく飲む順に返す。
 *
 * 同数のときはキー順にして、並びが呼び出すたびに入れ替わらないようにする
 * （押す位置が毎回変わると、かえって押し間違える）。
 */
export function topQuickDrinks(
  counts: Record<string, number> | undefined,
  limit: number,
  excludeKeys: string[] = [],
): QuickDrink[] {
  if (!counts) return [];
  const excluded = new Set(excludeKeys);

  return Object.entries(counts)
    .filter(([key, count]) => count > 0 && !excluded.has(key))
    .sort((a, b) => (b[1] - a[1] !== 0 ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .map(([key]) => {
      const [drinkTypeId, sizeId] = key.split(":");
      return buildQuickDrink(drinkTypeId, sizeId);
    })
    .filter((drink): drink is QuickDrink => drink !== null)
    .slice(0, limit);
}

/**
 * 直前に飲んだ1杯を「もう1杯」用に組み立てる。
 *
 * 記録そのものに量と度数が入っているので、手入力した「その他」も復元できる。
 * 数量は掛けずに1杯ぶんに戻す（まとめて2杯記録した次に押しても1杯増えるのが自然）。
 *
 * 記録にはサイズの表示名しか入っていないので、マスターの表示名と突き合わせて
 * サイズIDに戻す。戻せなければ回数は数えない（記録そのものには影響しない）。
 */
export function quickDrinkFromRecord(record: DrinkRecord): QuickDrink {
  const drink = findDrinkType(record.drinkTypeId);
  const size = drink?.sizes.find((s) => s.label === record.sizeLabel);
  const perDrinkAlcohol = pureAlcoholGrams(record.volumeMl, record.abvPercent);
  const perDrinkCalories =
    record.quantity > 0 ? record.calories / record.quantity : record.calories;

  return {
    key: `last:${record.id}`,
    countKey:
      drink && !drink.isCustom && size ? drinkCountKey(drink.id, size.id) : null,
    drinkTypeId: record.drinkTypeId,
    sizeId: size?.id ?? record.sizeLabel,
    emoji: drink?.emoji ?? "🍹",
    label: record.drinkLabel,
    sizeLabel: record.sizeLabel,
    volumeMl: record.volumeMl,
    abvPercent: record.abvPercent,
    alcoholG: perDrinkAlcohol,
    calories: perDrinkCalories,
  };
}
