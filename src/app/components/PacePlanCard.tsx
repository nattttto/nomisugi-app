"use client";

import { CalendarClock } from "lucide-react";
import { calcPacePlan, projectGoalReachedAt } from "../lib/sessionPlan";
import { formatDuration, formatGrams, formatTime } from "../lib/format";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  session: DrinkingSession;
  nowMs: number;
}

/**
 * 計画に沿ったペース配分。
 *
 * 「あと何g」だけだと、どう飲めばいいのかが分からない。
 * 終わりの時刻を決めてあるときは「次の1杯まで何分空ければ収まるか」まで出す。
 */
export default function PacePlanCard({ session, nowMs }: Props) {
  const plan = session.plan;
  if (!plan) return null;

  const endByMs = plan.endBy?.toMillis() ?? null;
  const pace = calcPacePlan({
    nowMs,
    endByMs,
    totalAlcoholG: session.totalAlcoholG,
    goalAlcoholG: session.goalAlcoholG,
  });
  if (!pace) return null;

  const reachedAtMs = projectGoalReachedAt({
    nowMs,
    startAtMs: session.startAt.toMillis(),
    totalAlcoholG: session.totalAlcoholG,
    goalAlcoholG: session.goalAlcoholG,
  });
  // 予定の終わりより前に上限へ届いてしまうときだけ知らせる
  const willRunOutEarly =
    reachedAtMs !== null && endByMs !== null && reachedAtMs < endByMs;

  return (
    <section className="sticker-card p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-extrabold text-muted">
        <CalendarClock className="h-4 w-4" strokeWidth={3} />
        {plan.mode === "party" ? "🍻 飲み会モード" : "🏠 今日の計画"}
      </h2>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-cream px-2 py-2.5">
          <p className="text-xs font-bold text-muted">上限まで</p>
          <p className="tabular text-2xl font-extrabold text-beer-deep">
            {formatGrams(pace.remainingG)}
            <span className="ml-0.5 text-base">g</span>
          </p>
          <p className="text-xs font-bold text-muted">
            中ジョッキ {pace.remainingDrinks.toFixed(1)} 杯ぶん
          </p>
        </div>
        <div className="rounded-xl bg-cream px-2 py-2.5">
          <p className="text-xs font-bold text-muted">
            {plan.endBy ? `${formatTime(plan.endBy.toDate())} まで` : "終わりの時刻"}
          </p>
          <p className="tabular text-2xl font-extrabold text-beer-deep">
            {plan.endBy ? formatDuration(pace.remainingMs) : "—"}
          </p>
          <p className="text-xs font-bold text-muted">
            {plan.endBy ? (pace.pastEnd ? "予定は過ぎています" : "残り") : "未設定"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-cream px-3 py-3 text-center">
        {pace.overGoal ? (
          <p className="text-sm font-extrabold text-berry-deep">
            今日の上限に届きました。ここからは水に切り替える頃合いです。
          </p>
        ) : pace.minutesPerDrink !== null ? (
          <p className="text-sm font-extrabold">
            次の1杯まで{" "}
            <span className="tabular text-xl text-beer-deep">
              {Math.round(pace.minutesPerDrink)} 分
            </span>{" "}
            空けると収まります
          </p>
        ) : plan.endBy === null ? (
          <p className="text-sm font-bold text-muted">
            終わりの時刻を決めておくと、1杯あたりの間隔まで出せます。
          </p>
        ) : (
          <p className="text-sm font-extrabold text-berry-deep">
            残りは中ジョッキ1杯ぶんもありません。
          </p>
        )}
      </div>

      {willRunOutEarly && (
        <p className="mt-3 rounded-xl bg-beer px-3 py-2 text-xs font-bold leading-relaxed text-ink shadow-sticker">
          いまのペースのままだと {formatTime(new Date(reachedAtMs))} 頃に上限へ届きます
          （予定は {formatTime(plan.endBy!.toDate())} まで）。
        </p>
      )}
    </section>
  );
}
