/**
 * 称号。
 *
 * **飲んだ量を称えるものは作らない。** 「5杯目を突破した」のような称号は
 * 飲み過ぎの肯定になってしまう。称えるのは、目標を守れたこと・水をはさめたこと・
 * 休肝日をつくれたこと・記録を続けられたこと の4つに限る。
 *
 * UI と Firestore に依存しない純粋関数だけを置く。
 */

import { drinkingDayRange } from "./drinkingDay";
import type { DrinkingSession } from "./types/firestore";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 現在値と達成に必要な値。進捗バーに使う */
  progress: number;
  target: number;
  achieved: boolean;
}

/** 目標を達成した回数 */
export function countGoalAchieved(sessions: DrinkingSession[]): number {
  return sessions.filter(
    (s) => s.goalAlcoholG !== null && s.totalAlcoholG <= s.goalAlcoholG,
  ).length;
}

/**
 * 目標達成の連続回数。現在の連続と、これまでの最長を返す。
 * 目標が設定されていなかった回は達成も未達成も判定できないので飛ばす。
 */
export function goalStreaks(sessions: DrinkingSession[]): {
  current: number;
  best: number;
} {
  const judged = sessions
    .filter((s) => s.goalAlcoholG !== null)
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());

  let best = 0;
  let running = 0;
  for (const session of judged) {
    if (session.totalAlcoholG <= (session.goalAlcoholG ?? 0)) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }
  return { current: running, best };
}

/**
 * 明示的に記録された休肝日のうち、いちばん長く続いた日数。
 *
 * **記録が無い日を休肝日として数えない。** それは「飲まなかった日」ではなく
 * 「アプリを開かなかった日」かもしれないため。
 * 称号は、実際に押して残した事実に対してだけ付ける。
 */
export function longestRestStreak(restDayKeys: string[]): number {
  const days = Array.from(new Set(restDayKeys)).sort();
  if (days.length === 0) return 0;

  const toTime = (dayKey: string) => drinkingDayRange(dayKey, 0).start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  let longest = 1;
  let running = 1;
  for (let i = 1; i < days.length; i += 1) {
    const gap = Math.round((toTime(days[i]) - toTime(days[i - 1])) / dayMs);
    running = gap === 1 ? running + 1 : 1;
    longest = Math.max(longest, running);
  }
  return longest;
}

/** 水をはさんだ回数 */
export function countSessionsWithWater(sessions: DrinkingSession[]): number {
  return sessions.filter((s) => s.waterCount > 0).length;
}

export function evaluateAchievements(
  sessions: DrinkingSession[],
  restDayKeys: string[] = [],
): Achievement[] {
  const recorded = sessions.length;
  const goalAchieved = countGoalAchieved(sessions);
  const streak = goalStreaks(sessions);
  const water = countSessionsWithWater(sessions);
  const restStreak = longestRestStreak(restDayKeys);
  const restTotal = new Set(restDayKeys).size;

  const definitions: Omit<Achievement, "achieved">[] = [
    {
      id: "first-record",
      emoji: "📝",
      title: "はじめの記録",
      description: "飲んだお酒を1回記録した",
      progress: recorded,
      target: 1,
    },
    {
      id: "goal-1",
      emoji: "🥉",
      title: "セルフコントロール初心者",
      description: "目標を守って飲み終えた",
      progress: goalAchieved,
      target: 1,
    },
    {
      id: "goal-10",
      emoji: "🥈",
      title: "飲酒マネージャー",
      description: "目標を10回守った",
      progress: goalAchieved,
      target: 10,
    },
    {
      id: "goal-30",
      emoji: "🥇",
      title: "セルフコントロールの達人",
      description: "目標を30回守った",
      progress: goalAchieved,
      target: 30,
    },
    {
      id: "streak-3",
      emoji: "🔥",
      title: "3回連続",
      description: "3回続けて目標を守った",
      progress: streak.best,
      target: 3,
    },
    {
      id: "water-10",
      emoji: "💧",
      title: "チェイサーの習慣",
      description: "飲みながら水をはさんだ回が10回",
      progress: water,
      target: 10,
    },
    {
      id: "rest-10",
      emoji: "🌙",
      title: "休肝日のある暮らし",
      description: "「今日は飲まなかった」を10日記録した",
      progress: restTotal,
      target: 10,
    },
    {
      id: "rest-7",
      emoji: "🌛",
      title: "休肝ウィーク",
      description: "7日続けて「飲まなかった」を記録した",
      progress: restStreak,
      target: 7,
    },
    {
      id: "record-30",
      emoji: "📖",
      title: "記録の習慣",
      description: "30回ぶんの飲酒を記録した",
      progress: recorded,
      target: 30,
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    achieved: definition.progress >= definition.target,
  }));
}
