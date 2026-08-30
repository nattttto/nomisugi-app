/**
 * 「今日の計画」に沿ったペース配分の計算。
 *
 * 飲み会は「飲むな」では成立しないので、**決めた終わりの時刻までに、
 * 決めた量で収まるペース**を出して、次の1杯までどれくらい空けたいかを見せる。
 *
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import { STANDARD_DRINK_G } from "./alcohol";

export interface PacePlan {
  /** 目標まで残っている純アルコール量(g)。超過していたら 0 */
  remainingG: number;
  /** 予定の終わりまでの残り時間(ms)。過ぎていたら 0 */
  remainingMs: number;
  /** 残りをビール中ジョッキ換算にした杯数 */
  remainingDrinks: number;
  /**
   * 1杯あたりどれくらい空ければ収まるか（分）。
   * もう1杯ぶんも残っていない場合と、終わりの時刻が未設定の場合は null。
   */
  minutesPerDrink: number | null;
  overGoal: boolean;
  pastEnd: boolean;
}

export function calcPacePlan(input: {
  nowMs: number;
  /** 予定の終わりの時刻。未設定なら null */
  endByMs: number | null;
  totalAlcoholG: number;
  goalAlcoholG: number | null;
}): PacePlan | null {
  if (input.goalAlcoholG === null) return null;

  const remainingG = Math.max(0, input.goalAlcoholG - input.totalAlcoholG);
  const remainingMs =
    input.endByMs === null ? 0 : Math.max(0, input.endByMs - input.nowMs);
  const remainingDrinks = remainingG / STANDARD_DRINK_G;

  // 残り時間を「これから飲める杯数」で割る。1杯ぶんも残っていないなら配分しようがない
  const minutesPerDrink =
    input.endByMs === null || remainingDrinks < 1
      ? null
      : remainingMs / 60000 / remainingDrinks;

  return {
    remainingG,
    remainingMs,
    remainingDrinks,
    minutesPerDrink,
    overGoal: input.totalAlcoholG >= input.goalAlcoholG,
    pastEnd: input.endByMs !== null && input.nowMs >= input.endByMs,
  };
}

/**
 * いまのペースのまま飲み続けた場合に、目標へ届く時刻。
 *
 * 「飲み始めてから今までの平均」で伸ばす。1杯目を入れた直後は分母が小さく、
 * 極端に早い時刻が出てしまうので、最低でも MIN_ELAPSED_MS 経ってから使う。
 *
 * 既に超えている場合と、ペースが出せない場合は null。
 */
const MIN_ELAPSED_MS = 20 * 60 * 1000;

export function projectGoalReachedAt(input: {
  nowMs: number;
  startAtMs: number;
  totalAlcoholG: number;
  goalAlcoholG: number | null;
}): number | null {
  if (input.goalAlcoholG === null) return null;
  if (input.totalAlcoholG >= input.goalAlcoholG) return null;

  const elapsedMs = input.nowMs - input.startAtMs;
  if (elapsedMs < MIN_ELAPSED_MS || input.totalAlcoholG <= 0) return null;

  const gramsPerMs = input.totalAlcoholG / elapsedMs;
  const restG = input.goalAlcoholG - input.totalAlcoholG;
  return input.nowMs + restG / gramsPerMs;
}
