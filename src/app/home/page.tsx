"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import BottomNav from "../components/BottomNav";
import DrinkLogModal from "../components/DrinkLogModal";
import AlcoholTimer from "../components/AlcoholTimer";
import WarningPanel from "../components/WarningPanel";
import SessionSummary from "../components/SessionSummary";
import { useCurrentUser } from "../lib/useCurrentUser";
import {
  addDrinkRecord,
  autoCloseIfStale,
  fetchActiveSession,
  fetchRecentSessions,
  fetchRecords,
  fetchSession,
  finishSession,
  incrementWaterCount,
  removeDrinkRecord,
  startSession,
} from "../lib/firestoreUtils";
import type { DrinkRecord, DrinkingSession } from "../lib/types/firestore";
import { evaluateWarnings } from "../lib/warnings";
import { personalPaceFromSessions } from "../lib/stats";
import { DEFAULT_DAY_START_HOUR } from "../lib/constants";
import { formatDuration, formatGrams, formatInt, formatTime } from "../lib/format";
import { findDrinkType } from "../lib/drinks";

/** 個人のペースを出すために読む、直近のセッション数 */
const PACE_SAMPLE_SESSIONS = 20;

export default function HomePage() {
  const { user, profile, loading } = useCurrentUser();
  const [session, setSession] = useState<DrinkingSession | null>(null);
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [summarySession, setSummarySession] = useState<DrinkingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // 過去の飲酒から出した個人のペース。ペース警告の基準に使う
  const [pace, setPace] = useState<{ minutesPerDrink: number | null; sampleSize: number }>({
    minutesPerDrink: null,
    sampleSize: 0,
  });

  const dayStartHour = profile?.settings.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const goalAlcoholG = profile?.goal.alcoholGrams ?? null;

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

  // 個人のペースは1杯記録するたびに変わるものではないので、開いたときに1回だけ読む
  useEffect(() => {
    if (loading || !user) return;
    void fetchRecentSessions(user.uid, PACE_SAMPLE_SESSIONS)
      .then((sessions) => setPace(personalPaceFromSessions(sessions)))
      .catch(() => {
        // 過去データが読めなくても、一般的な目安で警告は出せる
      });
  }, [loading, user]);

  const timerDrinks = useMemo(
    () => records.map((r) => ({ alcoholG: r.alcoholG, drankAtMs: r.drankAt.toMillis() })),
    [records],
  );

  const warnings = useMemo(() => {
    if (!session || !profile || !profile.settings.warningsEnabled) return [];
    return evaluateWarnings({
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
  }, [session, profile, records, now, goalAlcoholG, pace]);

  async function handleSubmitRecord(record: Omit<DrinkRecord, "id">) {
    if (!user) return;
    // 1杯目ならセッションを作ってから記録する
    const target = session ?? (await startSession(user.uid, dayStartHour, goalAlcoholG));
    await addDrinkRecord(user.uid, target.id, record);
    setModalOpen(false);
    await reload();
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
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        読み込み中...
      </main>
    );
  }

  const elapsedMs = session ? now - session.startAt.toMillis() : 0;
  const goalRest = goalAlcoholG !== null && session ? goalAlcoholG - session.totalAlcoholG : null;
  const goalRatio =
    goalAlcoholG && session ? Math.min(1, session.totalAlcoholG / goalAlcoholG) : 0;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-widest text-amber-400">🍺 NOMISUGI</h1>
        <p className="mt-1 text-sm text-slate-400">
          こんにちは、{profile?.displayName ?? user?.displayName ?? "ゲスト"}
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-sm text-slate-400">今日の飲酒</h2>
        {session ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="tabular text-3xl font-bold">{session.totalDrinks}</p>
                <p className="text-xs text-slate-500">杯</p>
              </div>
              <div>
                <p className="tabular text-3xl font-bold text-amber-400">
                  {formatGrams(session.totalAlcoholG)}
                </p>
                <p className="text-xs text-slate-500">純アルコール(g)</p>
              </div>
              <div>
                <p className="tabular text-3xl font-bold">{formatInt(session.totalCalories)}</p>
                <p className="text-xs text-slate-500">kcal</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">飲酒開始</dt>
                <dd className="tabular">{formatTime(session.startAt.toDate())}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">経過時間</dt>
                <dd className="tabular">{formatDuration(elapsedMs)}</dd>
              </div>
              {session.waterCount > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">水</dt>
                  <dd className="tabular">{session.waterCount} 杯</dd>
                </div>
              )}
              {session.totalCost > 0 && (
                <div>
                  <dt className="text-xs text-slate-500">金額</dt>
                  <dd className="tabular">¥{formatInt(session.totalCost)}</dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <p className="py-6 text-center text-slate-400">
            まだ今日の記録はありません。
            <br />
            1杯目を記録すると飲酒がはじまります。
          </p>
        )}
      </section>

      {goalAlcoholG !== null && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm text-slate-400">🎯 今日の目標</h2>
            <span className="tabular text-sm">純アルコール {goalAlcoholG}g 以内</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                goalRatio >= 1 ? "bg-red-400" : "bg-amber-400"
              }`}
              style={{ width: `${Math.round(goalRatio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {goalRest === null || goalRest > 0
              ? `あと ${formatGrams(Math.max(0, goalRest ?? goalAlcoholG))}g`
              : `目標を ${formatGrams(-(goalRest ?? 0))}g 超えています`}
          </p>
        </section>
      )}

      {warnings.length > 0 && (
        <div className="mb-4">
          <WarningPanel warnings={warnings} onDrinkWater={handleWater} />
        </div>
      )}

      <button
        onClick={() => setModalOpen(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-5 text-lg font-bold text-slate-950"
      >
        <Plus className="h-5 w-5" />
        お酒を記録
      </button>

      {records.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-slate-400">今日の内訳</h2>
            <button
              onClick={handleRemoveLast}
              className="flex items-center gap-1 text-xs text-slate-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              直前を取り消す
            </button>
          </div>
          <ul className="space-y-2">
            {records.map((record) => (
              <li key={record.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{findDrinkType(record.drinkTypeId)?.emoji ?? "🍹"}</span>
                  <span>
                    {record.drinkLabel}
                    <span className="ml-1 text-xs text-slate-500">{record.sizeLabel}</span>
                    {record.quantity > 1 && (
                      <span className="ml-1 text-amber-400">×{record.quantity}</span>
                    )}
                  </span>
                </span>
                <span className="tabular text-xs text-slate-400">
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
          className="w-full rounded-xl border border-slate-700 px-4 py-3 text-slate-300"
        >
          今日は終了
        </button>
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
