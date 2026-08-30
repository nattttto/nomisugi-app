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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm text-slate-400">
        <Timer className="h-4 w-4" />
        アルコール処理タイマー
      </h2>

      {remaining <= 0 ? (
        <p className="py-4 text-center text-slate-400">
          体内のアルコールは分解し終わったと推定されます。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">残っている推定量</p>
              <p className="tabular text-2xl font-bold text-amber-400">
                {formatGrams(remaining)}
                <span className="ml-0.5 text-base">g</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">処理完了の目安</p>
              <p className="tabular text-2xl font-bold text-amber-400">
                {soberAt ? formatTime(soberAt) : "--:--"}
              </p>
            </div>
          </div>

          <p className="tabular mt-4 text-center text-4xl font-bold tracking-wider">
            {soberAt ? formatCountdown(soberAt.getTime() - now) : "00:00:00"}
          </p>
        </>
      )}

      <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-500">
        {MEDICAL_DISCLAIMER}
        {showWeightHint && "マイページで体重を設定すると、推定の精度が上がります。"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-red-300/80">{DRIVING_DISCLAIMER}</p>
    </section>
  );
}
