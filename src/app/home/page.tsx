"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { CalendarClock, Moon, Plus, Trash2 } from "lucide-react";
import BottomNav from "../components/BottomNav";
import DrinkLogModal from "../components/DrinkLogModal";
import QuickDrinkBar from "../components/QuickDrinkBar";
import SessionPlanModal from "../components/SessionPlanModal";
import PacePlanCard from "../components/PacePlanCard";
import AlcoholTimer from "../components/AlcoholTimer";
import WarningPanel from "../components/WarningPanel";
import SessionSummary from "../components/SessionSummary";
import { useCurrentUser } from "../lib/useCurrentUser";
import {
  addDrinkRecord,
  autoCloseIfStale,
  bumpDrinkCount,
  fetchActiveSession,
  fetchRecentSessions,
  fetchRecords,
  fetchSession,
  finishSession,
  incrementWaterCount,
  isRestDay,
  markRestDay,
  removeDrinkRecord,
  startSession,
  unmarkRestDay,
} from "../lib/firestoreUtils";
import type { DrinkRecord, DrinkingSession, SessionPlan } from "../lib/types/firestore";
import { evaluateWarnings } from "../lib/warnings";
import { personalPaceFromSessions, weekdayOf } from "../lib/stats";
import { buildPersonalBaseline, personalInsights } from "../lib/personalization";
import { useDrinkingNotifications } from "../lib/useNotifications";
import {
  quickDrinkFromRecord,
  topQuickDrinks,
  type QuickDrink,
} from "../lib/quickDrinks";
import { DEFAULT_DAY_START_HOUR, DEFAULT_GOAL_ALCOHOL_G } from "../lib/constants";
import { toDrinkingDay } from "../lib/drinkingDay";
import { formatDuration, formatGrams, formatInt, formatTime } from "../lib/format";
import { findDrinkType } from "../lib/drinks";

/** 個人のペースと傾向を出すために読む、直近のセッション数 */
const PERSONAL_SAMPLE_SESSIONS = 30;

/** ワンタップ記録に並べる「よく飲むもの」の数 */
const QUICK_DRINK_COUNT = 3;

export default function HomePage() {
  const { user, profile, loading } = useCurrentUser();
  const [session, setSession] = useState<DrinkingSession | null>(null);
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [summarySession, setSummarySession] = useState<DrinkingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  /** 過去の飲酒。ペースの基準と、その人だけの気づきの両方に使う */
  const [pastSessions, setPastSessions] = useState<DrinkingSession[]>([]);
  /** 今日を「飲まなかった日」として記録済みか。判定前は null */
  const [restDayMarked, setRestDayMarked] = useState<boolean | null>(null);

  const dayStartHour = profile?.settings.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const todayKey = toDrinkingDay(new Date(now), dayStartHour);
  const profileGoal = profile?.goal.alcoholGrams ?? null;
  // 計画を立てた回は、その日の上限がセッションに入っている
  const goalAlcoholG = session?.goalAlcoholG ?? profileGoal;

  // 経過時間の表示を1分ごとに更新する（秒まで動かす必要はない）
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoadingSession(true);
    try {
      const active = await fetchActiveSession(user.uid);
      if (!active) {
        setSession(null);
        setRecords([]);
        return;
      }
      // 「今日は終了」を押し忘れて放置されたものはここで閉じる
      const closed = await autoCloseIfStale(user.uid, active, new Date(), dayStartHour);
      if (closed) {
        setSession(null);
        setRecords([]);
        return;
      }
      setSession(active);
      setRecords(await fetchRecords(user.uid, active.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
    } finally {
      setLoadingSession(false);
    }
  }, [user, dayStartHour]);

  useEffect(() => {
    if (!loading && user) void reload();
  }, [loading, user, reload]);

  // 過去の傾向は1杯記録するたびに変わるものではないので、開いたときに1回だけ読む
  useEffect(() => {
    if (loading || !user) return;
    void fetchRecentSessions(user.uid, PERSONAL_SAMPLE_SESSIONS)
      .then(setPastSessions)
      .catch(() => {
        // 過去データが読めなくても、一般的な目安で警告は出せる
      });
  }, [loading, user]);

  // 今日を休肝日として記録済みかを見る
  useEffect(() => {
    if (loading || !user) return;
    void isRestDay(user.uid, todayKey)
      .then(setRestDayMarked)
      .catch(() => setRestDayMarked(false));
  }, [loading, user, todayKey]);

  /** 終わった回だけを基準にする。進行中の回は合計が途中なので混ぜない */
  const finishedSessions = useMemo(
    () => pastSessions.filter((s) => s.status === "finished"),
    [pastSessions],
  );

  const pace = useMemo(
    () => personalPaceFromSessions(finishedSessions),
    [finishedSessions],
  );

  const timerDrinks = useMemo(
    () => records.map((r) => ({ alcoholG: r.alcoholG, drankAtMs: r.drankAt.toMillis() })),
    [records],
  );

  /** 直前の1杯。「もう1杯」で同じものをすぐ足せるようにする */
  const lastDrink = useMemo(
    () => (records.length > 0 ? quickDrinkFromRecord(records[records.length - 1]) : null),
    [records],
  );

  /**
   * よく飲むもの。直前の1杯と重複させない。
   * drinkCounts はプロフィールと一緒に開いたときだけ読むので、
   * 今日ぶんの増加は次に開いたときから反映される。
   */
  const frequentDrinks = useMemo(
    () =>
      topQuickDrinks(
        profile?.drinkCounts,
        QUICK_DRINK_COUNT,
        lastDrink?.countKey ? [lastDrink.countKey] : [],
      ),
    [profile?.drinkCounts, lastDrink],
  );

  const warnings = useMemo(() => {
    if (!session || !profile || !profile.settings.warningsEnabled) return [];

    const general = evaluateWarnings({
      records: records.map((r) => ({
        alcoholG: r.alcoholG,
        quantity: r.quantity,
        drankAtMs: r.drankAt.toMillis(),
      })),
      totalDrinks: session.totalDrinks,
      totalAlcoholG: session.totalAlcoholG,
      startAtMs: session.startAt.toMillis(),
      nowMs: now,
      goalAlcoholG,
      sex: profile.sex,
      personalMinutesPerDrink: pace.minutesPerDrink,
      personalSampleSize: pace.sampleSize,
    });

    const baseline = buildPersonalBaseline(
      finishedSessions,
      weekdayOf(session.drinkingDay),
    );
    const personal = personalInsights(baseline, {
      totalDrinks: session.totalDrinks,
      totalAlcoholG: session.totalAlcoholG,
      waterCount: session.waterCount,
    });

    return [...general, ...personal];
  }, [session, profile, records, now, goalAlcoholG, pace, finishedSessions]);

  useDrinkingNotifications(profile?.settings.notificationsEnabled === true, warnings);

  async function handleStartWithPlan(plan: SessionPlan, planGoalAlcoholG: number) {
    if (!user) return;
    await startSession(user.uid, dayStartHour, planGoalAlcoholG, plan);
    setPlanModalOpen(false);
    await reload();
  }

  /**
   * 1杯記録する。モーダルからもワンタップからもここを通す。
   *
   * countKey は「よく飲むもの」を出すための回数。記録本体とは切り離してあり、
   * 失敗しても無視する（bumpDrinkCount の中で握りつぶしている）。
   */
  async function recordDrink(record: Omit<DrinkRecord, "id">, countKey: string | null) {
    if (!user) return;
    // 計画を立てずに1杯目から記録した場合は、ここでセッションを作る
    const target = session ?? (await startSession(user.uid, dayStartHour, profileGoal));
    await addDrinkRecord(user.uid, target.id, record);
    if (countKey) void bumpDrinkCount(user.uid, countKey, record.quantity);
    await reload();
  }

  async function handleSubmitRecord(
    record: Omit<DrinkRecord, "id">,
    countKey: string | null,
  ) {
    await recordDrink(record, countKey);
    setModalOpen(false);
  }

  async function handleQuickRecord(drink: QuickDrink) {
    try {
      await recordDrink(
        {
          drinkTypeId: drink.drinkTypeId,
          drinkLabel: drink.label,
          sizeLabel: drink.sizeLabel,
          volumeMl: drink.volumeMl,
          abvPercent: drink.abvPercent,
          quantity: 1,
          alcoholG: drink.alcoholG,
          calories: drink.calories,
          cost: null,
          drankAt: Timestamp.now(),
        },
        drink.countKey,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "記録に失敗しました。");
    }
  }

  async function handleToggleRestDay() {
    if (!user) return;
    try {
      if (restDayMarked) {
        await unmarkRestDay(user.uid, todayKey);
        setRestDayMarked(false);
      } else {
        await markRestDay(user.uid, todayKey);
        setRestDayMarked(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "記録に失敗しました。");
    }
  }

  async function handleRemoveLast() {
    if (!user || !session || records.length === 0) return;
    const last = records[records.length - 1];
    if (!confirm(`「${last.drinkLabel} ${last.sizeLabel}」の記録を取り消しますか？`)) return;
    try {
      await removeDrinkRecord(user.uid, session.id, last);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り消しに失敗しました。");
    }
  }

  async function handleWater() {
    if (!user || !session) return;
    await incrementWaterCount(user.uid, session.id);
    await reload();
  }

  async function handleFinish() {
    if (!user || !session) return;
    if (!confirm("今日の飲酒を終了しますか？")) return;
    await finishSession(user.uid, session.id, "user");
    // 終了後の値でサマリを出すため、書き込み後のドキュメントを読み直す
    setSummarySession(await fetchSession(user.uid, session.id));
    setSession(null);
    setRecords([]);
  }

  if (loading || loadingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center font-bold text-muted">
        読み込み中...
      </main>
    );
  }

  const elapsedMs = session ? now - session.startAt.toMillis() : 0;
  const goalRest = goalAlcoholG !== null && session ? goalAlcoholG - session.totalAlcoholG : null;
  const goalRatio =
    goalAlcoholG && session ? Math.min(1, session.totalAlcoholG / goalAlcoholG) : 0;
  const overGoal = goalRest !== null && goalRest < 0;
  const todayIsPlanned = session?.plan != null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-32 pt-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <span className="inline-block -rotate-2 rounded-xl bg-beer px-3 py-1.5 text-lg font-extrabold tracking-wider text-ink shadow-pop">
          🍺 NOMISUGI
        </span>
        <p className="truncate text-sm font-extrabold text-muted">
          {profile?.displayName ?? user?.displayName ?? "ゲスト"} さん
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
          {error}
        </p>
      )}

      <section className="sticker-card mb-4 p-5">
        <h2 className="mb-4 text-sm font-extrabold text-muted">今日の飲酒</h2>
        {session ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="tabular text-4xl font-extrabold">{session.totalDrinks}</p>
                <p className="mt-0.5 text-xs font-bold text-muted">杯</p>
              </div>
              <div>
                <p className="tabular text-4xl font-extrabold text-beer-deep">
                  {formatGrams(session.totalAlcoholG)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted">純アルコール(g)</p>
              </div>
              <div>
                <p className="tabular text-4xl font-extrabold">
                  {formatInt(session.totalCalories)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted">kcal</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t-[3px] border-dotted border-ink/25 pt-4 text-sm font-bold">
              <div>
                <dt className="text-xs text-muted">飲酒開始</dt>
                <dd className="tabular">{formatTime(session.startAt.toDate())}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">経過時間</dt>
                <dd className="tabular">{formatDuration(elapsedMs)}</dd>
              </div>
              {session.waterCount > 0 && (
                <div>
                  <dt className="text-xs text-muted">水</dt>
                  <dd className="tabular">💧 {session.waterCount} 杯</dd>
                </div>
              )}
              {session.totalCost > 0 && (
                <div>
                  <dt className="text-xs text-muted">金額</dt>
                  <dd className="tabular">¥{formatInt(session.totalCost)}</dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <p className="py-6 text-center text-sm font-bold leading-relaxed text-muted">
            まだ今日の記録はありません。
            <br />
            1杯目を記録すると飲酒がはじまります。
          </p>
        )}
      </section>

      {/* 飲み始める前に計画を立てたり、休肝日にしたりできるのは、まだ始まっていないときだけ */}
      {!session && (
        <div className="mb-4 space-y-2">
          <button
            onClick={() => setPlanModalOpen(true)}
            className="sticker-press flex w-full items-center justify-center gap-2 rounded-2xl bg-paper px-4 py-4 font-extrabold text-ink"
          >
            <CalendarClock className="h-5 w-5" strokeWidth={3} />
            今日は飲み会？　先に計画を立てる
          </button>

          {/*
            記録が無い日は「飲まなかった日」ではなく「開かなかった日」かもしれない。
            休肝日を推定ではなく事実にするために、押して残してもらう。
          */}
          <button
            onClick={handleToggleRestDay}
            disabled={restDayMarked === null}
            className={`sticker-press flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 font-extrabold text-ink disabled:opacity-50 ${
              restDayMarked ? "bg-mint" : "bg-paper"
            }`}
          >
            <Moon className="h-5 w-5" strokeWidth={3} />
            {restDayMarked ? "今日は休肝日にしました（取り消す）" : "今日は飲まなかった"}
          </button>
        </div>
      )}

      {session && todayIsPlanned && (
        <div className="mb-4">
          <PacePlanCard session={session} nowMs={now} />
        </div>
      )}

      {goalAlcoholG !== null && (
        <section className="sticker-card mb-4 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold text-muted">🎯 今日の目標</h2>
            <span className="tabular text-sm font-extrabold">
              純アルコール {goalAlcoholG}g 以内
            </span>
          </div>
          <div className="h-5 w-full overflow-hidden rounded-full bg-cream shadow-sticker">
            <div
              className={`h-full transition-all ${overGoal ? "bg-berry" : "bg-beer"}`}
              style={{ width: `${Math.round(goalRatio * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-center text-lg font-extrabold">
            {goalRest === null || goalRest > 0 ? (
              <>
                あと{" "}
                <span className="text-beer-deep">
                  {formatGrams(Math.max(0, goalRest ?? goalAlcoholG))}g
                </span>
              </>
            ) : (
              <span className="text-berry-deep">
                目標を {formatGrams(-(goalRest ?? 0))}g 超えています
              </span>
            )}
          </p>
        </section>
      )}

      {warnings.length > 0 && (
        <div className="mb-4">
          <WarningPanel warnings={warnings} onDrinkWater={handleWater} />
        </div>
      )}

      <QuickDrinkBar
        lastDrink={lastDrink}
        frequent={frequentDrinks}
        onRecord={handleQuickRecord}
      />

      <button
        onClick={() => setModalOpen(true)}
        className="sticker-press mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-beer px-4 py-5 text-xl font-extrabold text-ink"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
        {lastDrink || frequentDrinks.length > 0 ? "ほかのお酒を記録" : "お酒を記録"}
      </button>

      {records.length > 0 && (
        <section className="sticker-card mb-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-muted">今日の内訳</h2>
            <button
              onClick={handleRemoveLast}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-berry-deep"
            >
              <Trash2 className="h-3.5 w-3.5" />
              直前を取り消す
            </button>
          </div>
          <ul className="space-y-2">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-bold"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-lg">
                    {findDrinkType(record.drinkTypeId)?.emoji ?? "🍹"}
                  </span>
                  <span className="truncate">
                    {record.drinkLabel}
                    <span className="ml-1 text-xs font-bold text-muted">{record.sizeLabel}</span>
                    {record.quantity > 1 && (
                      <span className="ml-1 text-beer-deep">×{record.quantity}</span>
                    )}
                  </span>
                </span>
                <span className="tabular shrink-0 text-xs text-muted">
                  {formatTime(record.drankAt.toDate())} / {formatGrams(record.alcoholG)}g
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(session || records.length > 0) && (
        <div className="mb-4">
          <AlcoholTimer
            drinks={timerDrinks}
            weightKg={profile?.weightKg ?? null}
            showWeightHint={!profile?.weightKg}
          />
        </div>
      )}

      {session && (
        <button
          onClick={handleFinish}
          className="sticker-press w-full rounded-xl bg-paper px-4 py-3 font-extrabold text-ink"
        >
          今日は終了
        </button>
      )}

      {planModalOpen && (
        <SessionPlanModal
          defaultGoalAlcoholG={profileGoal ?? DEFAULT_GOAL_ALCOHOL_G}
          onClose={() => setPlanModalOpen(false)}
          onStart={handleStartWithPlan}
        />
      )}

      {modalOpen && (
        <DrinkLogModal
          weightKg={profile?.weightKg ?? null}
          currentAlcoholG={session?.totalAlcoholG ?? 0}
          currentCalories={session?.totalCalories ?? 0}
          goalAlcoholG={goalAlcoholG}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmitRecord}
        />
      )}

      {summarySession && (
        <SessionSummary
          session={summarySession}
          weightKg={profile?.weightKg ?? null}
          onClose={() => setSummarySession(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}
