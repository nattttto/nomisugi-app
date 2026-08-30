import type { Timestamp } from "firebase/firestore";
import type { DrinkTypeId } from "../drinks";

/**
 * Firestore に入るデータの正となる型。
 *
 * 構造:
 *   users/{uid}                                    → UserProfile
 *   users/{uid}/sessions/{sessionId}               → DrinkingSession
 *   users/{uid}/sessions/{sessionId}/records/{id}  → DrinkRecord
 *   usernames/{id小文字}                            → UsernameRecord
 *
 * 飲酒データはすべて users/{uid} の下に置く。こうしておくと
 * セキュリティルールが `request.auth.uid == userId` の一本で済む。
 */

export type Sex = "male" | "female" | "unspecified";

export interface UserGoal {
  /** 1回の飲酒での純アルコール量の上限(g)。目標の主軸 */
  alcoholGrams: number;
  /** 補助的な杯数の目安。未設定なら杯数では判定しない */
  drinks: number | null;
}

export interface UserSettings {
  /** 飲酒日の切り替わり時刻(時)。深夜の飲酒を前日として集計する */
  dayStartHour: number;
  /** ペースや目標超過の警告を出すか */
  warningsEnabled: boolean;
}

export interface UserProfile {
  uid: string;
  /** ゲーム内・画面上に出る名前。Auth の displayName と同じ値を持たせる */
  displayName: string;
  createdAt: Timestamp;
  /** 任意項目。体重は分解時間の推定にだけ使う */
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  sex: Sex;
  goal: UserGoal;
  settings: UserSettings;
}

export type SessionStatus = "active" | "finished";

/**
 * 1回の飲酒（飲み会1回ぶん）。
 *
 * 合計値をこのドキュメントに持たせておくことで、月間・年間の集計を
 * records を読まずにセッションの一覧だけで出せる。
 */
export interface DrinkingSession {
  id: string;
  /** この飲酒が属する飲酒日 "2026-08-30" */
  drinkingDay: string;
  startAt: Timestamp;
  /** 終了していなければ null */
  endAt: Timestamp | null;
  /** 自動クローズの判定に使う。最後に1杯記録した時刻 */
  lastRecordAt: Timestamp;
  status: SessionStatus;
  /** ユーザーが「今日は終了」を押したか、放置されて自動で閉じたか */
  closedBy: "user" | "auto" | null;
  /** 杯数の合計（quantity の合計） */
  totalDrinks: number;
  totalAlcoholG: number;
  totalCalories: number;
  /** 金額を入れなかった記録は 0 として加算する */
  totalCost: number;
  /** 「水を飲む」を押した回数 */
  waterCount: number;
  /** 終了時点の目標。後から目標を変えても達成判定が揺れないようにスナップショットを持つ */
  goalAlcoholG: number | null;
}

export interface DrinkRecord {
  id: string;
  drinkTypeId: DrinkTypeId;
  /** マスターを後から直しても履歴が変わらないよう、表示名は記録時に写しておく */
  drinkLabel: string;
  sizeLabel: string;
  /** 1杯あたりの量(mL) */
  volumeMl: number;
  abvPercent: number;
  /** 何杯ぶんか */
  quantity: number;
  /** quantity を掛けた合計の純アルコール量(g) */
  alcoholG: number;
  /** quantity を掛けた合計カロリー(kcal) */
  calories: number;
  /** 任意入力。未入力は null */
  cost: number | null;
  drankAt: Timestamp;
}

export interface UsernameRecord {
  uid: string;
  /** 入力時の大文字小文字を保持したユーザーID */
  displayName: string;
}
