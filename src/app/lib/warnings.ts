/**
 * 飲み過ぎ防止の警告判定。
 *
 * 「禁止」ではなく「判断材料を出す」ためのものなので、文言は事実と推定値に留める。
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import {
  BASELINE_MINUTES_PER_DRINK,
  PERSONAL_BASELINE_MIN_SAMPLES,
  RISK_ALCOHOL_G_FEMALE,
  RISK_ALCOHOL_G_MALE,
} from "./constants";
import { STANDARD_DRINK_G } from "./alcohol";
import type { Sex } from "./types/firestore";

export type WarningLevel = "info" | "caution" | "alert";

export interface DrinkingWarning {
  id: string;
  level: WarningLevel;
  title: string;
  body: string;
}

/** 判定に必要な、記録1件ぶんの最小限の情報 */
export interface WarningRecord {
  alcoholG: number;
  quantity: number;
  drankAtMs: number;
}

export interface WarningInput {
  records: WarningRecord[];
  totalDrinks: number;
  totalAlcoholG: number;
  startAtMs: number;
  nowMs: number;
  goalAlcoholG: number | null;
  sex: Sex;
  /** 過去のデータから出した個人の平均ペース（分/杯）。無ければ null */
  personalMinutesPerDrink: number | null;
  /** 個人平均の元になった杯数。少ないうちは一般的な目安を使う */
  personalSampleSize: number;
}

/** 性別から、生活習慣病のリスクが高まるとされる純アルコール量(g)を選ぶ */
export function riskAlcoholG(sex: Sex): number {
  return sex === "female" ? RISK_ALCOHOL_G_FEMALE : RISK_ALCOHOL_G_MALE;
}

/** 記録の間隔から平均ペース（分/杯）を出す。2件以上ないと出せない */
export function averageMinutesPerDrink(records: WarningRecord[]): number | null {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.drankAtMs - b.drankAtMs);
  const spanMs = sorted[sorted.length - 1].drankAtMs - sorted[0].drankAtMs;
  const gaps = sorted.length - 1;
  if (spanMs <= 0) return null;
  return spanMs / gaps / 60000;
}

/** 直近2杯の間隔（分）。今のペースを見る */
export function latestIntervalMinutes(records: WarningRecord[]): number | null {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.drankAtMs - b.drankAtMs);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  return (last.drankAtMs - prev.drankAtMs) / 60000;
}

/**
 * 比較の基準にするペース（分/杯）。
 *
 * 記録が貯まるまでは個人平均が信用できないので、一般的な目安を使い、
 * 十分に貯まったら個人平均へ切り替える。
 */
export function baselineMinutesPerDrink(input: WarningInput): {
  minutes: number;
  isPersonal: boolean;
} {
  if (
    input.personalMinutesPerDrink !== null &&
    input.personalSampleSize >= PERSONAL_BASELINE_MIN_SAMPLES
  ) {
    return { minutes: input.personalMinutesPerDrink, isPersonal: true };
  }
  return { minutes: BASELINE_MINUTES_PER_DRINK, isPersonal: false };
}

/** 純アルコール量を「ビール中ジョッキ何杯ぶん」に言い換える */
export function toStandardDrinks(alcoholG: number): number {
  return alcoholG / STANDARD_DRINK_G;
}

function formatG(value: number): string {
  return value.toFixed(value < 10 ? 1 : 0);
}

/**
 * いま出すべき警告を、重い順に並べて返す。
 *
 * 同じ意味の警告が重ならないよう、目標超過が出ているときは接近の警告は出さない。
 */
export function evaluateWarnings(input: WarningInput): DrinkingWarning[] {
  const warnings: DrinkingWarning[] = [];
  const { totalAlcoholG, goalAlcoholG } = input;
  const risk = riskAlcoholG(input.sex);

  if (goalAlcoholG !== null && totalAlcoholG >= goalAlcoholG) {
    const over = totalAlcoholG - goalAlcoholG;
    warnings.push({
      id: "goal-exceeded",
      level: "alert",
      title: "目標を超えました",
      body:
        `目標の純アルコール ${formatG(goalAlcoholG)}g を ${formatG(over)}g 超えています。` +
        "ここで水に切り替えると、明日の体感がだいぶ変わります。",
    });
  } else if (goalAlcoholG !== null && totalAlcoholG >= goalAlcoholG * 0.75) {
    const rest = goalAlcoholG - totalAlcoholG;
    warnings.push({
      id: "goal-near",
      level: "caution",
      title: "目標まであと少し",
      body:
        `目標まで残り ${formatG(rest)}g（ビール中ジョッキ約 ${toStandardDrinks(rest).toFixed(1)} 杯ぶん）です。`,
    });
  }

  if (totalAlcoholG >= risk) {
    warnings.push({
      id: "risk-amount",
      level: "alert",
      title: `純アルコール ${formatG(totalAlcoholG)}g`,
      body:
        `厚生労働省のガイドラインでは、1日あたり ${risk}g 以上の飲酒は` +
        "生活習慣病のリスクを高めるとされています。",
    });
  }

  const interval = latestIntervalMinutes(input.records);
  const baseline = baselineMinutesPerDrink(input);
  if (interval !== null && input.records.length >= 2 && interval < baseline.minutes * 0.7) {
    warnings.push({
      id: "fast-pace",
      level: "caution",
      title: "ペースが速くなっています",
      body:
        `直近は ${Math.round(interval)} 分で次の1杯に入りました` +
        `（${baseline.isPersonal ? "あなたの平均" : "一般的な目安"} ${Math.round(baseline.minutes)} 分/杯）。` +
        "少し間隔を空けると、飲む量も自然と落ち着きます。",
    });
  }

  const elapsedHours = (input.nowMs - input.startAtMs) / 3600000;
  if (elapsedHours >= 4) {
    warnings.push({
      id: "long-session",
      level: "info",
      title: `飲み始めてから ${Math.floor(elapsedHours)} 時間`,
      body: "長くなってきました。水を1杯はさむタイミングかもしれません。",
    });
  }

  const order: Record<WarningLevel, number> = { alert: 0, caution: 1, info: 2 };
  return warnings.sort((a, b) => order[a.level] - order[b.level]);
}
