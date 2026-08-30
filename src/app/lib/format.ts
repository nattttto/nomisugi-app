/** 画面表示用の整形。UI から使う小物だけを置く */

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** 経過時間を「1時間32分」の形にする */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  return `${hours}時間${minutes}分`;
}

/** 残り時間を「03:42:15」の形にする。タイマー表示用 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("ja-JP");
}

/** 純アルコール量。小さい値だけ小数第1位まで出す */
export function formatGrams(value: number): string {
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

export function formatYen(value: number): string {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}
