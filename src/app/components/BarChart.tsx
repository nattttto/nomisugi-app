"use client";

/**
 * 横棒グラフ。
 *
 * グラフのために外部ライブラリを足したくないので、幅を % で指定した div で描く。
 * 縦棒よりも横棒のほうが、スマホの縦画面でラベルが読みやすい。
 *
 * 棒の縁はカードの縁（3px）より細い 2px にしている。
 * 同じ太さだと行が並んだときに縁だけが目立って、量の違いが読めなくなるため。
 */

interface BarChartItem {
  label: string;
  value: number;
  /** 棒の右に出す補足。省略すると値をそのまま出す */
  valueLabel?: string;
}

interface Props {
  items: BarChartItem[];
  /** 値が0の行も出すか。月別グラフでは飲まなかった月も見せたい */
  showEmpty?: boolean;
  emptyMessage?: string;
}

export default function BarChart({ items, showEmpty = true, emptyMessage }: Props) {
  const visible = showEmpty ? items : items.filter((item) => item.value > 0);
  const max = Math.max(...visible.map((item) => item.value), 0);

  if (visible.length === 0 || max === 0) {
    return (
      <p className="py-6 text-center text-sm font-bold text-muted">
        {emptyMessage ?? "データがありません。"}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="tabular w-9 shrink-0 text-right text-xs font-extrabold text-muted">
            {item.label}
          </span>
          <span className="h-5 flex-1 overflow-hidden rounded-full border-[2px] border-ink bg-cream">
            <span
              className="block h-full bg-beer"
              style={{ width: `${max === 0 ? 0 : (item.value / max) * 100}%` }}
            />
          </span>
          <span className="tabular w-14 shrink-0 text-right text-xs font-extrabold">
            {item.valueLabel ?? item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
