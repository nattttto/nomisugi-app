"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { estimatedSoberAt, remainingAlcoholG } from "../lib/alcohol";
import { formatCountdown, formatGrams, formatTime } from "../lib/format";
import { DRIVING_DISCLAIMER, MEDICAL_DISCLAIMER } from "../lib/constants";

interface Props {
  drinks: { alcoholG: number; drankAtMs: number }[];
  weightKg: number | null;
  /** 体重が未設定のときに「設定すると精度が上がる」と案内するか */
  showWeightHint?: boolean;
}

/**
 * アルコール処理タイマー。
 *
 * 表示はすべて推定値。1秒ごとに再計算するが、計算自体は alcohol.ts の純粋関数に任せる。
 */
export default function AlcoholTimer({ drinks, weightKg, showWeightHint }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = remainingAlcoholG(drinks, now, weightKg);
  const soberAt = estimatedSoberAt(drinks, now, weightKg);

  return (
    <section className="sticker-card p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-extrabold text-muted">
        <Timer className="h-4 w-4" strokeWidth={3} />
        アルコール処理タイマー
      </h2>

      {remaining <= 0 ? (
        <p className="py-4 text-center text-sm font-bold text-muted">
          体内のアルコールは分解し終わったと推定されます。
        </p>
      ) : (
        <>
          <p className="tabular rounded-2xl bg-ink py-3 text-center text-4xl font-extrabold tracking-wider text-cream">
            {soberAt ? formatCountdown(soberAt.getTime() - now) : "00:00:00"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-cream px-2 py-2.5">
              <p className="text-xs font-bold text-muted">残っている推定量</p>
              <p className="tabular text-2xl font-extrabold text-beer-deep">
                {formatGrams(remaining)}
                <span className="ml-0.5 text-base">g</span>
              </p>
            </div>
            <div className="rounded-xl bg-cream px-2 py-2.5">
              <p className="text-xs font-bold text-muted">処理完了の目安</p>
              <p className="tabular text-2xl font-extrabold text-beer-deep">
                {soberAt ? formatTime(soberAt) : "--:--"}
              </p>
            </div>
          </div>
        </>
      )}

      <p className="mt-4 border-t-[3px] border-dotted border-ink/25 pt-3 text-xs font-bold leading-relaxed text-muted">
        {MEDICAL_DISCLAIMER}
        {showWeightHint && "マイページで体重を設定すると、推定の精度が上がります。"}
      </p>
      <p className="mt-1 text-xs font-bold leading-relaxed text-berry-deep">
        {DRIVING_DISCLAIMER}
      </p>
    </section>
  );
}
