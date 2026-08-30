/**
 * 「飲酒日」の計算。
 *
 * 22時に飲み始めて翌1時に終わる、という飲み方は普通に起きる。
 * カレンダー上の日付で区切ると1回の飲み会が2日に割れ、飲酒日数も二重に数えてしまうため、
 * 午前4時（DEFAULT_DAY_START_HOUR）を境にした独自の「飲酒日」で集計する。
 */

import { DEFAULT_DAY_START_HOUR } from "./constants";

/** "2026-08-30" 形式。ローカルタイムで組み立てる（toISOString は UTC になるので使わない） */
export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** その時刻が属する飲酒日のキー。午前4時より前は前日として扱う */
export function toDrinkingDay(date: Date, dayStartHour = DEFAULT_DAY_START_HOUR): string {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - dayStartHour);
  return formatDayKey(shifted);
}

/** 飲酒日キーが表す実時間の範囲 [start, end) */
export function drinkingDayRange(
  dayKey: string,
  dayStartHour = DEFAULT_DAY_START_HOUR,
): { start: Date; end: Date } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, dayStartHour, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** 「8月30日(金)」のような表示。飲酒日キーから作る */
export function formatDayLabel(dayKey: string): string {
  const { start } = drinkingDayRange(dayKey, 0);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][start.getDay()];
  return `${start.getMonth() + 1}月${start.getDate()}日(${weekday})`;
}

/** 飲酒日キーから月キー "2026-08" を取り出す */
export function toMonthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}
