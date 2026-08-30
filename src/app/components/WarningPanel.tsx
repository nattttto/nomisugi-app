"use client";

import { AlertTriangle, Droplet, Info } from "lucide-react";
import type { DrinkingWarning } from "../lib/warnings";

/**
 * 塗りの上の文字はすべて ink。
 * 明るい色の上に白文字を置くとコントラストが 3:1 前後まで落ちるため。
 */
const STYLES = {
  alert: { fill: "bg-berry", Icon: AlertTriangle },
  caution: { fill: "bg-beer", Icon: AlertTriangle },
  info: { fill: "bg-aqua", Icon: Info },
} as const;

interface Props {
  warnings: DrinkingWarning[];
  /** 「水を飲む」を押したときの記録。押せるのは飲酒中だけ */
  onDrinkWater?: () => void;
}

export default function WarningPanel({ warnings, onDrinkWater }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning) => {
        const style = STYLES[warning.level];
        return (
          <section
            key={warning.id}
            className={`pop-in rounded-2xl p-4 text-ink shadow-sticker ${style.fill}`}
          >
            <h3 className="mb-1 flex items-center gap-1.5 font-extrabold">
              <style.Icon className="h-4 w-4 shrink-0" strokeWidth={3} />
              {warning.title}
            </h3>
            <p className="text-sm font-bold leading-relaxed">{warning.body}</p>
          </section>
        );
      })}

      {onDrinkWater && (
        <button
          onClick={onDrinkWater}
          className="sticker-press flex w-full items-center justify-center gap-2 rounded-xl bg-aqua px-4 py-3 font-extrabold text-ink"
        >
          <Droplet className="h-4 w-4" strokeWidth={3} />
          水を飲んだ
        </button>
      )}
    </div>
  );
}
