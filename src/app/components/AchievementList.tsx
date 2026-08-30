"use client";

import { evaluateAchievements, goalStreaks } from "../lib/achievements";
import { toDrinkingDay } from "../lib/drinkingDay";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  sessions: DrinkingSession[];
  dayStartHour: number;
}

export default function AchievementList({ sessions, dayStartHour }: Props) {
  const today = toDrinkingDay(new Date(), dayStartHour);
  const achievements = evaluateAchievements(sessions, today);
  const streak = goalStreaks(sessions);
  const achievedCount = achievements.filter((a) => a.achieved).length;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm text-slate-400">🏆 称号</h2>
        <span className="tabular text-xs text-slate-500">
          {achievedCount} / {achievements.length}
        </span>
      </div>

      {streak.current > 0 && (
        <p className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          🔥 目標達成 {streak.current} 回連続中
        </p>
      )}

      <ul className="space-y-3">
        {achievements.map((achievement) => {
          const ratio = Math.min(1, achievement.progress / achievement.target);
          return (
            <li
              key={achievement.id}
              className={`rounded-xl border p-3 ${
                achievement.achieved
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-slate-800 bg-slate-950/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${achievement.achieved ? "" : "grayscale opacity-40"}`}>
                  {achievement.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold ${
                      achievement.achieved ? "text-amber-200" : "text-slate-400"
                    }`}
                  >
                    {achievement.title}
                  </p>
                  <p className="text-xs text-slate-500">{achievement.description}</p>
                </div>
                <span className="tabular shrink-0 text-xs text-slate-500">
                  {Math.min(achievement.progress, achievement.target)}/{achievement.target}
                </span>
              </div>
              {!achievement.achieved && (
                <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-slate-600"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        称号は「たくさん飲んだこと」ではなく、目標を守れたこと・水をはさめたこと・
        休肝日をつくれたこと・記録を続けられたことに対して付きます。
      </p>
    </section>
  );
}
