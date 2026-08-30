/**
 * 飲酒データの集計と傾向分析。
 *
 * すべて DrinkingSession の配列から計算する。セッションに合計値を持たせてあるので、
 * 月間・年間の集計で records を読む必要はない。
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import { DEFAULT_DAY_START_HOUR } from "./constants";
import { drinkingDayRange, toMonthKey } from "./drinkingDay";
import type { DrinkingSession } from "./types/firestore";

export interface PeriodSummary {
  /** 飲酒回数。1日に2回飲めば2 */
  sessionCount: number;
  /** 飲酒日数。同じ飲酒日は1と数える */
  drinkingDays: number;
  totalDrinks: number;
  totalAlcoholG: number;
  totalCalories: number;
  totalCost: number;
  /** 1回あたりの平均。回数が0なら0 */
  avgDrinksPerSession: number;
  avgAlcoholPerSession: number;
  /** 1回の最大杯数 */
  maxDrinks: number;
  /** 目標が設定されていた回数と、そのうち達成した回数 */
  goalSetCount: number;
  goalAchievedCount: number;
}

export const EMPTY_SUMMARY: PeriodSummary = {
  sessionCount: 0,
  drinkingDays: 0,
  totalDrinks: 0,
  totalAlcoholG: 0,
  totalCalories: 0,
  totalCost: 0,
  avgDrinksPerSession: 0,
  avgAlcoholPerSession: 0,
  maxDrinks: 0,
  goalSetCount: 0,
  goalAchievedCount: 0,
};

export function summarizeSessions(sessions: DrinkingSession[]): PeriodSummary {
  if (sessions.length === 0) return EMPTY_SUMMARY;

  const days = new Set<string>();
  let totalDrinks = 0;
  let totalAlcoholG = 0;
  let totalCalories = 0;
  let totalCost = 0;
  let maxDrinks = 0;
  let goalSetCount = 0;
  let goalAchievedCount = 0;

  for (const session of sessions) {
    days.add(session.drinkingDay);
    totalDrinks += session.totalDrinks;
    totalAlcoholG += session.totalAlcoholG;
    totalCalories += session.totalCalories;
    totalCost += session.totalCost;
    maxDrinks = Math.max(maxDrinks, session.totalDrinks);
    if (session.goalAlcoholG !== null) {
      goalSetCount += 1;
      if (session.totalAlcoholG <= session.goalAlcoholG) goalAchievedCount += 1;
    }
  }

  return {
    sessionCount: sessions.length,
    drinkingDays: days.size,
    totalDrinks,
    totalAlcoholG,
    totalCalories,
    totalCost,
    avgDrinksPerSession: totalDrinks / sessions.length,
    avgAlcoholPerSession: totalAlcoholG / sessions.length,
    maxDrinks,
    goalSetCount,
    goalAchievedCount,
  };
}

export interface SummaryDiff {
  drinkingDays: number;
  sessionCount: number;
  totalDrinks: number;
  totalAlcoholG: number;
  avgDrinksPerSession: number;
}

/** 前の期間との差（現在 − 前）。マイナスなら減っている */
export function diffSummaries(current: PeriodSummary, previous: PeriodSummary): SummaryDiff {
  return {
    drinkingDays: current.drinkingDays - previous.drinkingDays,
    sessionCount: current.sessionCount - previous.sessionCount,
    totalDrinks: current.totalDrinks - previous.totalDrinks,
    totalAlcoholG: current.totalAlcoholG - previous.totalAlcoholG,
    avgDrinksPerSession: current.avgDrinksPerSession - previous.avgDrinksPerSession,
  };
}

/** 変化率(%)。前の期間が0のときは比べようがないので null */
export function changeRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/* ── 期間で絞る ────────────────────────────────────────── */

export function filterByMonth(sessions: DrinkingSession[], monthKey: string): DrinkingSession[] {
  return sessions.filter((s) => toMonthKey(s.drinkingDay) === monthKey);
}

export function filterByYear(sessions: DrinkingSession[], year: number): DrinkingSession[] {
  const prefix = `${year}-`;
  return sessions.filter((s) => s.drinkingDay.startsWith(prefix));
}

/** "2026-08" の1つ前の月キー */
export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 年間グラフ用。1月から12月までを必ず12個返す */
export function monthlyBreakdown(
  sessions: DrinkingSession[],
  year: number,
): { monthKey: string; month: number; summary: PeriodSummary }[] {
  const byMonth = new Map<string, DrinkingSession[]>();
  for (const session of filterByYear(sessions, year)) {
    const key = toMonthKey(session.drinkingDay);
    const list = byMonth.get(key);
    if (list) list.push(session);
    else byMonth.set(key, [session]);
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    return {
      monthKey,
      month,
      summary: summarizeSessions(byMonth.get(monthKey) ?? []),
    };
  });
}

/** カレンダー表示用。飲酒日ごとの合計 */
export function dailyTotals(
  sessions: DrinkingSession[],
): Map<string, { drinks: number; alcoholG: number; sessions: number }> {
  const map = new Map<string, { drinks: number; alcoholG: number; sessions: number }>();
  for (const session of sessions) {
    const current = map.get(session.drinkingDay) ?? { drinks: 0, alcoholG: 0, sessions: 0 };
    map.set(session.drinkingDay, {
      drinks: current.drinks + session.totalDrinks,
      alcoholG: current.alcoholG + session.totalAlcoholG,
      sessions: current.sessions + 1,
    });
  }
  return map;
}

/* ── 傾向分析 ──────────────────────────────────────────── */

export interface WeekdayStat {
  /** 0=日曜 */
  weekday: number;
  sessionCount: number;
  avgAlcoholG: number;
}

export interface DrinkingPattern {
  /** データが足りずに出せない項目は null にする */
  avgDrinks: number | null;
  avgAlcoholG: number | null;
  /** 飲み始めの平均時刻（"19:18" 形式） */
  avgStartTime: string | null;
  weekdayStats: WeekdayStat[];
  /** 1回あたりの平均純アルコール量がいちばん多い曜日 */
  heaviestWeekday: WeekdayStat | null;
  /** 5杯目に到達した割合(0〜1) */
  fifthDrinkRate: number | null;
  /** 水を飲んだ回／飲まなかった回の平均杯数 */
  avgDrinksWithWater: number | null;
  avgDrinksWithoutWater: number | null;
  sessionCount: number;
}

/** 曜日を飲酒日キーから求める。0=日曜 */
export function weekdayOf(dayKey: string): number {
  return drinkingDayRange(dayKey, 0).start.getDay();
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * 飲み始めの平均時刻。
 *
 * 日付をまたぐので、そのまま時刻を平均すると 19時 と 1時 の平均が 10時 になってしまう。
 * 飲酒日の開始時刻（既定は午前4時）からの経過分に直してから平均する。
 */
function averageStartTime(
  sessions: DrinkingSession[],
  dayStartHour: number,
): string | null {
  if (sessions.length === 0) return null;

  const minutes = sessions.map((session) => {
    const date = session.startAt.toDate();
    const raw = date.getHours() * 60 + date.getMinutes();
    const offset = dayStartHour * 60;
    return raw >= offset ? raw - offset : raw + 24 * 60 - offset;
  });

  const mean = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
  const absolute = Math.round(mean + dayStartHour * 60) % (24 * 60);
  const hour = Math.floor(absolute / 60);
  const minute = absolute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function analyzePattern(
  sessions: DrinkingSession[],
  dayStartHour = DEFAULT_DAY_START_HOUR,
): DrinkingPattern {
  if (sessions.length === 0) {
    return {
      avgDrinks: null,
      avgAlcoholG: null,
      avgStartTime: null,
      weekdayStats: [],
      heaviestWeekday: null,
      fifthDrinkRate: null,
      avgDrinksWithWater: null,
      avgDrinksWithoutWater: null,
      sessionCount: 0,
    };
  }

  const byWeekday = new Map<number, number[]>();
  for (const session of sessions) {
    const weekday = weekdayOf(session.drinkingDay);
    const list = byWeekday.get(weekday);
    if (list) list.push(session.totalAlcoholG);
    else byWeekday.set(weekday, [session.totalAlcoholG]);
  }

  const weekdayStats: WeekdayStat[] = Array.from({ length: 7 }, (_, weekday) => {
    const values = byWeekday.get(weekday) ?? [];
    return {
      weekday,
      sessionCount: values.length,
      avgAlcoholG: average(values) ?? 0,
    };
  });

  const withData = weekdayStats.filter((stat) => stat.sessionCount > 0);
  const heaviestWeekday =
    withData.length === 0
      ? null
      : withData.reduce((max, stat) => (stat.avgAlcoholG > max.avgAlcoholG ? stat : max));

  const withWater = sessions.filter((s) => s.waterCount > 0).map((s) => s.totalDrinks);
  const withoutWater = sessions.filter((s) => s.waterCount === 0).map((s) => s.totalDrinks);

  return {
    avgDrinks: average(sessions.map((s) => s.totalDrinks)),
    avgAlcoholG: average(sessions.map((s) => s.totalAlcoholG)),
    avgStartTime: averageStartTime(sessions, dayStartHour),
    weekdayStats,
    heaviestWeekday,
    fifthDrinkRate: sessions.filter((s) => s.totalDrinks >= 5).length / sessions.length,
    avgDrinksWithWater: average(withWater),
    avgDrinksWithoutWater: average(withoutWater),
    sessionCount: sessions.length,
  };
}

/* ── 個人の飲酒ペース ──────────────────────────────────── */

/**
 * 過去の飲酒から「1杯あたり何分か」を出す。
 *
 * 記録1件ずつの間隔ではなく、終了したセッションの
 * 「飲酒時間 ÷ 杯の間隔数」から求める。セッションのドキュメントだけで計算できるので、
 * 過去の records を読み直さずに済む。
 *
 * 1杯だけで終えた回は間隔が無いので使わない。
 */
export function personalPaceFromSessions(sessions: DrinkingSession[]): {
  minutesPerDrink: number | null;
  sampleSize: number;
} {
  let totalMinutes = 0;
  let intervals = 0;

  for (const session of sessions) {
    if (session.status !== "finished" || session.endAt === null) continue;
    if (session.totalDrinks < 2) continue;
    const durationMinutes =
      (session.endAt.toMillis() - session.startAt.toMillis()) / 60000;
    if (durationMinutes <= 0) continue;
    totalMinutes += durationMinutes;
    intervals += session.totalDrinks - 1;
  }

  if (intervals === 0) return { minutesPerDrink: null, sampleSize: 0 };
  return { minutesPerDrink: totalMinutes / intervals, sampleSize: intervals };
}
