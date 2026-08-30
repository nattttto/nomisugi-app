/**
 * Firestore の参照と読み書きのヘルパー。
 * 画面からは必ずここを経由して、コレクションのパスを1か所にまとめる。
 */

import {
  CollectionReference,
  DocumentReference,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  DrinkRecord,
  DrinkingSession,
  SessionPlan,
  UserProfile,
  UsernameRecord,
} from "./types/firestore";
import { SESSION_AUTO_CLOSE_HOURS } from "./constants";
import { toDrinkingDay } from "./drinkingDay";

/* ── 参照 ─────────────────────────────────────────────── */

export function getUserDocRef(uid: string) {
  return doc(db, "users", uid) as DocumentReference<UserProfile>;
}

export function getSessionsCollectionRef(uid: string) {
  return collection(db, "users", uid, "sessions") as CollectionReference<DrinkingSession>;
}

export function getSessionDocRef(uid: string, sessionId: string) {
  return doc(db, "users", uid, "sessions", sessionId) as DocumentReference<DrinkingSession>;
}

export function getRecordsCollectionRef(uid: string, sessionId: string) {
  return collection(
    db,
    "users",
    uid,
    "sessions",
    sessionId,
    "records",
  ) as CollectionReference<DrinkRecord>;
}

export function getUsernamesCollectionRef() {
  return collection(db, "usernames") as CollectionReference<UsernameRecord>;
}

export function getUsernameDocRef(username: string) {
  return doc(db, "usernames", username.trim().toLowerCase()) as DocumentReference<UsernameRecord>;
}

/* ── プロフィール ──────────────────────────────────────── */

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(getUserDocRef(uid));
  return snap.exists() ? { ...snap.data(), uid } : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(getUserDocRef(profile.uid), profile);
}

export async function patchUserProfile(
  uid: string,
  patch: Partial<UserProfile>,
): Promise<void> {
  await updateDoc(getUserDocRef(uid), patch);
}

/* ── セッション ────────────────────────────────────────── */

/**
 * 進行中のセッションを取得する。
 *
 * 同時に active なセッションは1つしか作らないので、orderBy を付けずに1件取る
 * （orderBy を足すと複合インデックスが必要になるため）。
 */
export async function fetchActiveSession(uid: string): Promise<DrinkingSession | null> {
  const snap = await getDocs(
    query(getSessionsCollectionRef(uid), where("status", "==", "active"), limit(1)),
  );
  const found = snap.docs[0];
  return found ? { ...found.data(), id: found.id } : null;
}

export async function fetchSession(
  uid: string,
  sessionId: string,
): Promise<DrinkingSession | null> {
  const snap = await getDoc(getSessionDocRef(uid, sessionId));
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

/** 飲酒日の範囲でセッションを取る。履歴・統計で使う */
export async function fetchSessionsBetween(
  uid: string,
  fromDayKey: string,
  toDayKey: string,
): Promise<DrinkingSession[]> {
  const snap = await getDocs(
    query(
      getSessionsCollectionRef(uid),
      where("drinkingDay", ">=", fromDayKey),
      where("drinkingDay", "<=", toDayKey),
      orderBy("drinkingDay", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/** 直近のセッションを新しい順に取る */
export async function fetchRecentSessions(
  uid: string,
  count: number,
): Promise<DrinkingSession[]> {
  const snap = await getDocs(
    query(getSessionsCollectionRef(uid), orderBy("startAt", "desc"), limit(count)),
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/**
 * 新しい飲酒を始める。
 *
 * plan を渡すと「今日の計画」を立てた回になる。渡さなければ、
 * 1杯目を記録した勢いで始まった回として plan は null のままにする。
 */
export async function startSession(
  uid: string,
  dayStartHour: number,
  goalAlcoholG: number | null,
  plan: SessionPlan | null = null,
): Promise<DrinkingSession> {
  const now = new Date();
  const ref = doc(getSessionsCollectionRef(uid));
  const session: DrinkingSession = {
    id: ref.id,
    drinkingDay: toDrinkingDay(now, dayStartHour),
    startAt: Timestamp.fromDate(now),
    endAt: null,
    lastRecordAt: Timestamp.fromDate(now),
    status: "active",
    closedBy: null,
    totalDrinks: 0,
    totalAlcoholG: 0,
    totalCalories: 0,
    totalCost: 0,
    waterCount: 0,
    goalAlcoholG,
    plan,
  };
  await setDoc(ref, session);
  return session;
}

/**
 * 1杯記録する。
 *
 * 記録の追加とセッション合計の更新を同じトランザクションで行う。
 * 片方だけ通ると「杯数は増えたのに記録が無い」状態になり、後から直せない。
 */
export async function addDrinkRecord(
  uid: string,
  sessionId: string,
  record: Omit<DrinkRecord, "id">,
): Promise<void> {
  const sessionRef = getSessionDocRef(uid, sessionId);
  const recordRef = doc(getRecordsCollectionRef(uid, sessionId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error("飲酒セッションが見つかりません。");
    const session = snap.data();
    if (session.status !== "active") {
      throw new Error("この飲酒は既に終了しています。");
    }

    tx.set(recordRef, { ...record, id: recordRef.id });
    tx.update(sessionRef, {
      totalDrinks: session.totalDrinks + record.quantity,
      totalAlcoholG: session.totalAlcoholG + record.alcoholG,
      totalCalories: session.totalCalories + record.calories,
      totalCost: session.totalCost + (record.cost ?? 0),
      lastRecordAt: record.drankAt,
    });
  });
}

/** 直近の記録を1件取り消す（押し間違いの救済） */
export async function removeDrinkRecord(
  uid: string,
  sessionId: string,
  record: DrinkRecord,
): Promise<void> {
  const sessionRef = getSessionDocRef(uid, sessionId);
  const recordRef = doc(getRecordsCollectionRef(uid, sessionId), record.id);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error("飲酒セッションが見つかりません。");
    const session = snap.data();
    if (session.status !== "active") {
      throw new Error("終了した飲酒の記録は取り消せません。");
    }

    tx.delete(recordRef);
    tx.update(sessionRef, {
      totalDrinks: Math.max(0, session.totalDrinks - record.quantity),
      totalAlcoholG: Math.max(0, session.totalAlcoholG - record.alcoholG),
      totalCalories: Math.max(0, session.totalCalories - record.calories),
      totalCost: Math.max(0, session.totalCost - (record.cost ?? 0)),
    });
  });
}

export async function incrementWaterCount(uid: string, sessionId: string): Promise<void> {
  const sessionRef = getSessionDocRef(uid, sessionId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) return;
    tx.update(sessionRef, { waterCount: snap.data().waterCount + 1 });
  });
}

/** 飲酒を終える。closedBy で手動か自動かを残す */
export async function finishSession(
  uid: string,
  sessionId: string,
  closedBy: "user" | "auto",
  endAt: Date = new Date(),
): Promise<void> {
  await updateDoc(getSessionDocRef(uid, sessionId), {
    status: "finished",
    closedBy,
    endAt: Timestamp.fromDate(endAt),
  });
}

export async function fetchRecords(uid: string, sessionId: string): Promise<DrinkRecord[]> {
  const snap = await getDocs(
    query(getRecordsCollectionRef(uid, sessionId), orderBy("drankAt", "asc")),
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/* ── 自動クローズ ──────────────────────────────────────── */

/**
 * 「今日は終了」を押し忘れたセッションを閉じる。
 *
 * 最後の記録から SESSION_AUTO_CLOSE_HOURS 経っているか、飲酒日が変わっていれば
 * 放置とみなす。終了時刻は最後の記録の時刻にする（開いたままの時間を
 * 飲酒時間に含めないため）。
 */
export function shouldAutoClose(
  session: DrinkingSession,
  now: Date,
  dayStartHour: number,
): boolean {
  const idleMs = now.getTime() - session.lastRecordAt.toDate().getTime();
  if (idleMs >= SESSION_AUTO_CLOSE_HOURS * 60 * 60 * 1000) return true;
  return toDrinkingDay(now, dayStartHour) !== session.drinkingDay;
}

export async function autoCloseIfStale(
  uid: string,
  session: DrinkingSession,
  now: Date,
  dayStartHour: number,
): Promise<boolean> {
  if (!shouldAutoClose(session, now, dayStartHour)) return false;
  await finishSession(uid, session.id, "auto", session.lastRecordAt.toDate());
  return true;
}
