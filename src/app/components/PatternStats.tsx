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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2.5">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="tabular text-right text-sm font-extrabold">{value}</dd>
    </div>
  );
}

export default function PatternStats({ sessions, dayStartHour }: Props) {
  const pattern = analyzePattern(sessions, dayStartHour);
  const pace = personalPaceFromSessions(sessions);

  if (pattern.sessionCount < MIN_SESSIONS_FOR_PATTERN) {
    return (
      <section className="sticker-card p-5">
        <h2 className="mb-2 text-sm font-extrabold text-muted">🧠 あなたの飲酒傾向</h2>
        <p className="text-sm font-bold leading-relaxed text-muted">
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
      <section className="sticker-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">
          🧠 あなたの飲酒傾向（{pattern.sessionCount} 回ぶん）
        </h2>

        <dl className="space-y-2">
          <Row
            label="🍺 1回あたりの平均"
            value={`${pattern.avgDrinks?.toFixed(1)} 杯 / ${formatGrams(pattern.avgAlcoholG ?? 0)}g`}
          />
          {pattern.avgStartTime && (
            <Row label="⏰ 飲み始めの平均" value={pattern.avgStartTime} />
          )}
          {pattern.heaviestWeekday && (
            <Row
              label="📅 いちばん多い曜日"
              value={`${WEEKDAY_LABELS[pattern.heaviestWeekday.weekday]}曜日（平均 ${formatGrams(
                pattern.heaviestWeekday.avgAlcoholG,
              )}g）`}
            />
          )}
          {pattern.fifthDrinkRate !== null && (
            <Row
              label="🍺 5杯目に届いた割合"
              value={`${Math.round(pattern.fifthDrinkRate * 100)}%`}
            />
          )}
        </dl>
      </section>

      <section className="sticker-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">
          曜日ごとの平均（純アルコール）
        </h2>
        <BarChart items={weekdayItems} />
      </section>

      {waterGap !== null && (
        <section className="sticker-card p-5">
          <h2 className="mb-4 text-sm font-extrabold text-muted">💧 水をはさんだ回との比較</h2>
          <dl className="space-y-2">
            <Row
              label="水を飲んだ回の平均"
              value={`${pattern.avgDrinksWithWater?.toFixed(1)} 杯`}
            />
            <Row
              label="水を飲まなかった回の平均"
              value={`${pattern.avgDrinksWithoutWater?.toFixed(1)} 杯`}
            />
          </dl>
          <p className="mt-3 border-t-[3px] border-dotted border-ink/25 pt-3 text-xs font-bold leading-relaxed text-muted">
            {waterGap > 0.3
              ? `水をはさんだ回のほうが平均 ${waterGap.toFixed(1)} 杯少なくなっています。`
              : "いまのところ、水をはさんだかどうかで杯数に大きな差は出ていません。"}
            <br />
            どちらの回も条件はそろっていないので、因果関係を示すものではありません。
          </p>
        </section>
      )}

      <section className="sticker-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-muted">⏱ あなたの飲酒ペース</h2>
        {pace.minutesPerDrink === null ? (
          <p className="text-sm font-bold text-muted">
            2杯以上飲んで終了した記録がまだありません。
          </p>
        ) : (
          <>
            <p className="tabular rounded-xl bg-beer py-2 text-center text-3xl font-extrabold text-ink shadow-sticker">
              {Math.round(pace.minutesPerDrink)} 分 / 杯
            </p>
            <p className="mt-3 text-xs font-bold leading-relaxed text-muted">
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
