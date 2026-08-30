/**
 * 過去の記録から出す、その人だけに当てはまる介入。
 *
 * 一般論（「飲み過ぎに注意」）は誰の行動も変えない。
 * 「あなたは金曜に多い」「5杯目に入った回の7割で目標を超えている」のように、
 * **自分のデータで示されたときだけ** 立ち止まる理由になる。
 *
 * そのぶん、少ない記録で断定すると嘘になる。件数が足りない項目は出さない。
 *
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import { weekdayOf } from "./stats";
import type { DrinkingWarning } from "./warnings";
import type { DrinkingSession } from "./types/firestore";

/** 全体の傾向を出すのに必要な記録数 */
const MIN_SESSIONS = 5;
/** 曜日ごとの傾向を出すのに必要な、その曜日の記録数 */
const MIN_WEEKDAY_SESSIONS = 3;
/** 「5杯目」の傾向を出すのに必要な、5杯目に届いた回数 */
const MIN_FIFTH_SESSIONS = 3;
/** 水の効果を出すのに必要な、水あり／水なしそれぞれの回数 */
const MIN_WATER_SESSIONS = 3;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export interface PersonalBaseline {
  sessionCount: number;
  avgDrinks: number | null;
  avgAlcoholG: number | null;
  /** 今日の曜日 */
  weekday: number;
  weekdaySessionCount: number;
  weekdayAvgAlcoholG: number | null;
  /** 5杯目に届いた回のうち、目標を超えた割合(0〜1) */
  goalMissRateAfterFifth: number | null;
  fifthReachedCount: number;
  /** 水なしの平均杯数 − 水ありの平均杯数。プラスなら水をはさんだ回のほうが少ない */
  waterEffectDrinks: number | null;
  avgDrinksWithWater: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * 過去のセッションから基準値を作る。
 * 進行中のセッションは合計が途中なので、渡す側で除いておくこと。
 */
export function buildPersonalBaseline(
  sessions: DrinkingSession[],
  weekday: number,
): PersonalBaseline {
  const weekdaySessions = sessions.filter((s) => weekdayOf(s.drinkingDay) === weekday);

  const fifthReached = sessions.filter((s) => s.totalDrinks >= 5);
  const fifthWithGoal = fifthReached.filter((s) => s.goalAlcoholG !== null);
  const fifthMissed = fifthWithGoal.filter((s) => s.totalAlcoholG > (s.goalAlcoholG ?? 0));

  const withWater = sessions.filter((s) => s.waterCount > 0).map((s) => s.totalDrinks);
  const withoutWater = sessions.filter((s) => s.waterCount === 0).map((s) => s.totalDrinks);
  const avgWithWater = average(withWater);
  const avgWithoutWater = average(withoutWater);
  const enoughWaterSamples =
    withWater.length >= MIN_WATER_SESSIONS && withoutWater.length >= MIN_WATER_SESSIONS;

  return {
    sessionCount: sessions.length,
    avgDrinks: average(sessions.map((s) => s.totalDrinks)),
    avgAlcoholG: average(sessions.map((s) => s.totalAlcoholG)),
    weekday,
    weekdaySessionCount: weekdaySessions.length,
    weekdayAvgAlcoholG: average(weekdaySessions.map((s) => s.totalAlcoholG)),
    goalMissRateAfterFifth:
      fifthWithGoal.length >= MIN_FIFTH_SESSIONS
        ? fifthMissed.length / fifthWithGoal.length
        : null,
    fifthReachedCount: fifthReached.length,
    waterEffectDrinks:
      enoughWaterSamples && avgWithWater !== null && avgWithoutWater !== null
        ? avgWithoutWater - avgWithWater
        : null,
    avgDrinksWithWater: enoughWaterSamples ? avgWithWater : null,
  };
}

export interface CurrentSessionState {
  totalDrinks: number;
  totalAlcoholG: number;
  waterCount: number;
}

function formatG(value: number): string {
  return value.toFixed(value < 10 ? 1 : 0);
}

/**
 * いまの状況に当てはまる、その人だけの気づきを返す。
 *
 * 出す・出さないの判定はすべて件数で決める。データが足りないときは黙る。
 */
export function personalInsights(
  baseline: PersonalBaseline,
  current: CurrentSessionState,
): DrinkingWarning[] {
  const insights: DrinkingWarning[] = [];
  if (baseline.sessionCount < MIN_SESSIONS) return insights;

  // 飲み始めに、その曜日の傾向を知らせる
  if (
    current.totalDrinks <= 1 &&
    baseline.weekdaySessionCount >= MIN_WEEKDAY_SESSIONS &&
    baseline.weekdayAvgAlcoholG !== null &&
    baseline.avgAlcoholG !== null &&
    baseline.weekdayAvgAlcoholG > baseline.avgAlcoholG * 1.15
  ) {
    insights.push({
      id: "personal-weekday",
      level: "info",
      title: `${WEEKDAY_LABELS[baseline.weekday]}曜日は多めになりがちです`,
      body:
        `過去 ${baseline.weekdaySessionCount} 回の${WEEKDAY_LABELS[baseline.weekday]}曜日は平均 ` +
        `${formatG(baseline.weekdayAvgAlcoholG)}g で、ふだんの平均 ` +
        `${formatG(baseline.avgAlcoholG)}g を上回っています。`,
    });
  }

  // 5杯目に入る手前で、これまでの結果を見せる
  if (
    current.totalDrinks === 4 &&
    baseline.goalMissRateAfterFifth !== null &&
    baseline.goalMissRateAfterFifth >= 0.5
  ) {
    insights.push({
      id: "personal-fifth",
      level: "caution",
      title: "次が5杯目です",
      body:
        `これまで5杯目に入った回のうち ${Math.round(baseline.goalMissRateAfterFifth * 100)}% で ` +
        "目標を超えています。ここで水をはさむか、間隔を空けてみませんか。",
    });
  }

  // まだ水を飲んでいないとき、水をはさんだ回との差を見せる
  if (
    current.waterCount === 0 &&
    current.totalDrinks >= 3 &&
    baseline.waterEffectDrinks !== null &&
    baseline.avgDrinksWithWater !== null &&
    baseline.waterEffectDrinks >= 0.5
  ) {
    insights.push({
      id: "personal-water",
      level: "info",
      title: "水をはさんだ回は少なめでした",
      body:
        `水をはさんだ回の平均は ${baseline.avgDrinksWithWater.toFixed(1)} 杯で、` +
        `はさまなかった回より ${baseline.waterEffectDrinks.toFixed(1)} 杯少なくなっています。`,
    });
  }

  // ふだんの平均を超えたことを知らせる
  if (
    baseline.avgAlcoholG !== null &&
    current.totalAlcoholG > baseline.avgAlcoholG * 1.2 &&
    current.totalDrinks >= 2
  ) {
    insights.push({
      id: "personal-over-average",
      level: "info",
      title: "いつもより多めのペースです",
      body:
        `ふだんの1回あたりの平均は ${formatG(baseline.avgAlcoholG)}g ですが、` +
        `今日はすでに ${formatG(current.totalAlcoholG)}g です。`,
    });
  }

  return insights;
}
