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

/** 飲酒日と飲酒日のあいだで、いちばん長く空いた日数（休肝日の最長連続） */
export function longestRestDays(sessions: DrinkingSession[], today?: string): number {
  const days = Array.from(new Set(sessions.map((s) => s.drinkingDay))).sort();
  if (days.length === 0) return 0;

  const toTime = (dayKey: string) => drinkingDayRange(dayKey, 0).start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  let longest = 0;
  for (let i = 1; i < days.length; i += 1) {
    const gap = Math.round((toTime(days[i]) - toTime(days[i - 1])) / dayMs) - 1;
    longest = Math.max(longest, gap);
  }

  // 最後に飲んだ日から今日までも「空いている日数」として数える。
  // 今日はまだ終わっていないので数に入れない（飲酒日どうしの数え方と揃える）
  if (today) {
    const gap = Math.round((toTime(today) - toTime(days[days.length - 1])) / dayMs) - 1;
    longest = Math.max(longest, gap);
  }
  return longest;
}

/** 水をはさんだ回数 */
export function countSessionsWithWater(sessions: DrinkingSession[]): number {
  return sessions.filter((s) => s.waterCount > 0).length;
}

export function evaluateAchievements(
  sessions: DrinkingSession[],
  today?: string,
): Achievement[] {
  const recorded = sessions.length;
  const goalAchieved = countGoalAchieved(sessions);
  const streak = goalStreaks(sessions);
  const water = countSessionsWithWater(sessions);
  const rest = longestRestDays(sessions, today);

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
      id: "rest-7",
      emoji: "🌙",
      title: "休肝ウィーク",
      description: "7日続けてお酒を飲まない期間をつくった",
      progress: rest,
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
