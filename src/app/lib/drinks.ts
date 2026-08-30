/**
 * 飲料マスター。
 *
 * 度数(abv)とサイズ(mL)から純アルコール量を、kcalPer100ml からカロリーを出す。
 * kcal を「純アルコール量 × 7.1」だけで計算するとビールや日本酒の糖質分が
 * 丸ごと抜けて2〜3割低く出るため、飲料ごとの 100mL あたりの値を持つ。
 *
 * ここの値はあくまで一般的な銘柄の代表値。記録時にスナップショットを
 * DrinkRecord へ書き込むので、後からこの表を直しても過去の記録は変わらない。
 */

export type DrinkTypeId =
  | "beer"
  | "highball"
  | "chuhai"
  | "wine"
  | "sake"
  | "shochu"
  | "cocktail"
  | "other";

export interface DrinkSize {
  id: string;
  label: string;
  /** この1杯の量(mL)。焼酎など割って飲むものは「原液の量」 */
  volumeMl: number;
}

export interface DrinkType {
  id: DrinkTypeId;
  label: string;
  emoji: string;
  /** アルコール度数(%) */
  abvPercent: number;
  /** 100mL あたりのカロリー(kcal) */
  kcalPer100ml: number;
  sizes: DrinkSize[];
  /** サイズが「原液の量」を指すもの（水やお湯で割っても純アルコール量は変わらない） */
  volumeIsUndiluted?: boolean;
  /** 量と度数を手入力するもの */
  isCustom?: boolean;
  note?: string;
}

export const DRINK_TYPES: DrinkType[] = [
  {
    id: "beer",
    label: "ビール",
    emoji: "🍺",
    abvPercent: 5,
    kcalPer100ml: 40,
    sizes: [
      { id: "small", label: "小（グラス・小瓶）", volumeMl: 250 },
      { id: "medium", label: "中（中ジョッキ・中瓶）", volumeMl: 500 },
      { id: "large", label: "大（大ジョッキ・大瓶）", volumeMl: 700 },
    ],
  },
  {
    id: "highball",
    label: "ハイボール",
    emoji: "🥃",
    abvPercent: 7,
    kcalPer100ml: 40,
    sizes: [
      { id: "small", label: "小", volumeMl: 250 },
      { id: "medium", label: "中（ジョッキ）", volumeMl: 350 },
      { id: "large", label: "大（メガ）", volumeMl: 700 },
    ],
  },
  {
    id: "chuhai",
    label: "チューハイ・サワー",
    emoji: "🍋",
    abvPercent: 6,
    kcalPer100ml: 55,
    sizes: [
      { id: "can350", label: "350mL 缶", volumeMl: 350 },
      { id: "glass", label: "ジョッキ", volumeMl: 400 },
      { id: "can500", label: "500mL 缶", volumeMl: 500 },
    ],
  },
  {
    id: "wine",
    label: "ワイン",
    emoji: "🍷",
    abvPercent: 12,
    kcalPer100ml: 73,
    sizes: [
      { id: "glass", label: "グラス", volumeMl: 120 },
      { id: "large", label: "大きめのグラス", volumeMl: 180 },
      { id: "half", label: "ハーフボトル", volumeMl: 375 },
      { id: "bottle", label: "ボトル", volumeMl: 750 },
    ],
  },
  {
    id: "sake",
    label: "日本酒",
    emoji: "🍶",
    abvPercent: 15,
    kcalPer100ml: 103,
    sizes: [
      { id: "half", label: "半合（お猪口2〜3杯）", volumeMl: 90 },
      { id: "one", label: "一合", volumeMl: 180 },
      { id: "two", label: "二合", volumeMl: 360 },
    ],
  },
  {
    id: "shochu",
    label: "焼酎・ウイスキー",
    emoji: "🥃",
    abvPercent: 25,
    kcalPer100ml: 141,
    volumeIsUndiluted: true,
    note: "水割り・お湯割り・ロックのどれでも、量は「割る前のお酒の量」で選んでください。",
    sizes: [
      { id: "single", label: "シングル（30mL）", volumeMl: 30 },
      { id: "double", label: "ダブル（60mL）", volumeMl: 60 },
      { id: "strong", label: "濃いめ（90mL）", volumeMl: 90 },
    ],
  },
  {
    id: "cocktail",
    label: "カクテル",
    emoji: "🍸",
    abvPercent: 10,
    kcalPer100ml: 100,
    sizes: [
      { id: "short", label: "ショート", volumeMl: 90 },
      { id: "medium", label: "スタンダード", volumeMl: 200 },
      { id: "long", label: "ロング", volumeMl: 350 },
    ],
  },
  {
    id: "other",
    label: "その他",
    emoji: "🍹",
    abvPercent: 5,
    // 度数から計算するので、この値は使わない（getKcalPer100ml を参照）
    kcalPer100ml: 0,
    isCustom: true,
    note: "量と度数を入力してください。カロリーはアルコール分から計算します。",
    sizes: [{ id: "custom", label: "自由入力", volumeMl: 350 }],
  },
];

export function findDrinkType(id: DrinkTypeId | string): DrinkType | undefined {
  return DRINK_TYPES.find((d) => d.id === id);
}
