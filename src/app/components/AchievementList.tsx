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
    <section className="sticker-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-extrabold text-muted">🏆 称号</h2>
        <span className="tabular text-xs font-extrabold text-muted">
          {achievedCount} / {achievements.length}
        </span>
      </div>

      {streak.current > 0 && (
        <p className="mb-4 rounded-xl bg-mint px-4 py-2.5 text-center text-sm font-extrabold text-ink shadow-sticker">
          🔥 目標達成 {streak.current} 回連続中
        </p>
      )}

      <ul className="space-y-2">
        {achievements.map((achievement) => {
          const ratio = Math.min(1, achievement.progress / achievement.target);
          return (
            <li
              key={achievement.id}
              className={`rounded-xl p-3 ${
                achievement.achieved ? "bg-beer shadow-sticker" : "bg-cream"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl ${achievement.achieved ? "" : "opacity-30 grayscale"}`}
                >
                  {achievement.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-extrabold ${
                      achievement.achieved ? "text-ink" : "text-muted"
                    }`}
                  >
                    {achievement.title}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      achievement.achieved ? "text-ink/70" : "text-faint"
                    }`}
                  >
                    {achievement.description}
                  </p>
                </div>
                <span className="tabular shrink-0 text-xs font-extrabold text-muted">
                  {Math.min(achievement.progress, achievement.target)}/{achievement.target}
                </span>
              </div>
              {!achievement.achieved && (
                <span className="mt-2 block h-2 w-full overflow-hidden rounded-full border-[2px] border-ink bg-paper">
                  <span
                    className="block h-full bg-beer"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t-[3px] border-dotted border-ink/25 pt-3 text-xs font-bold leading-relaxed text-muted">
        称号は「たくさん飲んだこと」ではなく、目標を守れたこと・水をはさめたこと・
        休肝日をつくれたこと・記録を続けられたことに対して付きます。
      </p>
    </section>
  );
}
