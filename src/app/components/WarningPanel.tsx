"use client";

import { AlertTriangle, Droplet, Info } from "lucide-react";
import type { DrinkingWarning } from "../lib/warnings";

const STYLES = {
  alert: {
    box: "border-red-500/40 bg-red-500/10",
    title: "text-red-300",
    Icon: AlertTriangle,
  },
  caution: {
    box: "border-amber-500/40 bg-amber-500/10",
    title: "text-amber-300",
    Icon: AlertTriangle,
  },
  info: {
    box: "border-sky-500/40 bg-sky-500/10",
    title: "text-sky-300",
    Icon: Info,
  },
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
            className={`fade-up rounded-2xl border p-4 ${style.box}`}
          >
            <h3 className={`mb-1 flex items-center gap-2 font-bold ${style.title}`}>
              <style.Icon className="h-4 w-4 shrink-0" />
              {warning.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">{warning.body}</p>
          </section>
        );
      })}

      {onDrinkWater && (
        <button
          onClick={onDrinkWater}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 font-bold text-sky-200"
        >
          <Droplet className="h-4 w-4" />
          水を飲んだ
        </button>
      )}
    </div>
  );
}
