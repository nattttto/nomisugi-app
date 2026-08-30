"use client";

import BarChart from "./BarChart";
import { analyzePattern, personalPaceFromSessions } from "../lib/stats";
import { formatGrams } from "../lib/format";
import { PERSONAL_BASELINE_MIN_SAMPLES } from "../lib/constants";
import type { DrinkingSession } from "../lib/types/firestore";

interface Props {
  sessions: DrinkingSession[];
  dayStartHour: number;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** これ未満だと傾向と呼べるものが出ないので、数字を出さずに件数だけ伝える */
const MIN_SESSIONS_FOR_PATTERN = 3;

export default function PatternStats({ sessions, dayStartHour }: Props) {
  const pattern = analyzePattern(sessions, dayStartHour);
  const pace = personalPaceFromSessions(sessions);

  if (pattern.sessionCount < MIN_SESSIONS_FOR_PATTERN) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-2 text-sm text-slate-400">🧠 あなたの飲酒傾向</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          記録が {pattern.sessionCount} 回ぶんしかないため、まだ傾向は出せません。
          <br />
          {MIN_SESSIONS_FOR_PATTERN} 回ぶん貯まると表示されます。
        </p>
      </section>
    );
  }

  const weekdayItems = pattern.weekdayStats
    .filter((stat) => stat.sessionCount > 0)
    .map((stat) => ({
      label: WEEKDAY_LABELS[stat.weekday],
      value: stat.avgAlcoholG,
      valueLabel: `${formatGrams(stat.avgAlcoholG)}g`,
    }));

  const waterGap =
    pattern.avgDrinksWithWater !== null && pattern.avgDrinksWithoutWater !== null
      ? pattern.avgDrinksWithoutWater - pattern.avgDrinksWithWater
      : null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">
          🧠 あなたの飲酒傾向（{pattern.sessionCount} 回ぶん）
        </h2>

        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">🍺 1回あたりの平均</dt>
            <dd className="tabular">
              {pattern.avgDrinks?.toFixed(1)} 杯 / {formatGrams(pattern.avgAlcoholG ?? 0)}g
            </dd>
          </div>
          {pattern.avgStartTime && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">⏰ 飲み始めの平均</dt>
              <dd className="tabular">{pattern.avgStartTime}</dd>
            </div>
          )}
          {pattern.heaviestWeekday && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">📅 いちばん多い曜日</dt>
              <dd className="tabular">
                {WEEKDAY_LABELS[pattern.heaviestWeekday.weekday]}曜日（平均{" "}
                {formatGrams(pattern.heaviestWeekday.avgAlcoholG)}g）
              </dd>
            </div>
          )}
          {pattern.fifthDrinkRate !== null && (
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">🍺 5杯目に届いた割合</dt>
              <dd className="tabular">{Math.round(pattern.fifthDrinkRate * 100)}%</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">曜日ごとの平均（純アルコール）</h2>
        <BarChart items={weekdayItems} />
      </section>

      {waterGap !== null && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-sm text-slate-400">💧 水をはさんだ回との比較</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">水を飲んだ回の平均</dt>
              <dd className="tabular">{pattern.avgDrinksWithWater?.toFixed(1)} 杯</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">水を飲まなかった回の平均</dt>
              <dd className="tabular">{pattern.avgDrinksWithoutWater?.toFixed(1)} 杯</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
            {waterGap > 0.3
              ? `水をはさんだ回のほうが平均 ${waterGap.toFixed(1)} 杯少なくなっています。`
              : "いまのところ、水をはさんだかどうかで杯数に大きな差は出ていません。"}
            <br />
            どちらの回も条件はそろっていないので、因果関係を示すものではありません。
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm text-slate-400">⏱ あなたの飲酒ペース</h2>
        {pace.minutesPerDrink === null ? (
          <p className="text-sm text-slate-400">
            2杯以上飲んで終了した記録がまだありません。
          </p>
        ) : (
          <>
            <p className="tabular text-2xl font-bold text-amber-400">
              {Math.round(pace.minutesPerDrink)} 分 / 杯
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {pace.sampleSize >= PERSONAL_BASELINE_MIN_SAMPLES
                ? `${pace.sampleSize} 回ぶんの間隔から計算しています。飲酒中のペース警告はこの値を基準にしています。`
                : `${pace.sampleSize} 回ぶんの間隔から計算しています。${PERSONAL_BASELINE_MIN_SAMPLES} 回に達するまでは、飲酒中の警告は一般的な目安（30分/杯）で判定します。`}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
