/**
 * 健康・アルコールに関する数値と文言。
 *
 * このアプリは医学的な判断をしない。すべて「目安」として提示し、
 * 断定的な表現を避けるため、表示に使う文言はここに集約する。
 */

/** 画面に出す免責。処理タイマー・カロリー・警告など推定値の近くに必ず添える */
export const MEDICAL_DISCLAIMER =
  "表示される数値はすべて一般的な目安から計算した推定値です。分解速度には大きな個人差があり、体調・体質・食事によっても変わります。";

/** 運転に関する注意。処理タイマーは「飲酒運転をしてよい時刻」ではない */
export const DRIVING_DISCLAIMER =
  "このタイマーは飲酒運転の可否を判断するものではありません。お酒を飲んだら運転はしないでください。";

/**
 * 厚生労働省「健康に配慮した飲酒に関するガイドライン」（2024年）で示されている、
 * 生活習慣病のリスクを高めるとされる1日あたりの純アルコール量。
 */
export const RISK_ALCOHOL_G_MALE = 40;
export const RISK_ALCOHOL_G_FEMALE = 20;

/** 「節度ある適度な飲酒」としてよく挙げられる1日あたりの純アルコール量 */
export const MODERATE_ALCOHOL_G = 20;

/** 目標の初期値。1回の飲酒での純アルコール量(g) */
export const DEFAULT_GOAL_ALCOHOL_G = 40;

/** 体重が未設定のときに分解時間の計算で使う体重(kg) */
export const DEFAULT_WEIGHT_KG = 70;

/**
 * 1時間あたりに分解される純アルコール量の目安（体重1kgあたり）。
 * 「体重(kg) × 0.1 g/時」として広く使われている概算。
 */
export const ALCOHOL_METABOLISM_G_PER_KG_PER_HOUR = 0.1;

/** 純アルコール1gあたりのエネルギー(kcal) */
export const KCAL_PER_ALCOHOL_G = 7.1;

/** エタノールの比重。純アルコール量の計算に使う */
export const ETHANOL_DENSITY = 0.8;

/**
 * 個人の平均ペースが無いときに使う「1杯あたりの標準的な間隔」（分）。
 * 記録が貯まったら個人の平均に切り替える。
 */
export const BASELINE_MINUTES_PER_DRINK = 30;

/** 個人平均を使い始めるのに必要な過去の記録数 */
export const PERSONAL_BASELINE_MIN_SAMPLES = 20;

/** 飲酒日の切り替わり時刻（時）。深夜まで飲んでも1回の飲酒として集計するため */
export const DEFAULT_DAY_START_HOUR = 4;

/**
 * 最後の記録からこの時間が経ったセッションは、終了ボタンを押し忘れたものとみなして
 * 自動的に閉じる。
 */
export const SESSION_AUTO_CLOSE_HOURS = 3;
