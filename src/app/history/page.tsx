"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BottomNav from "../components/BottomNav";
import SessionHistoryList from "../components/SessionHistoryList";
import MonthlyStats from "../components/MonthlyStats";
import YearlyStats from "../components/YearlyStats";
import PatternStats from "../components/PatternStats";
import AchievementList from "../components/AchievementList";
import { useCurrentUser } from "../lib/useCurrentUser";
import { fetchRecentSessions, fetchSessionsBetween } from "../lib/firestoreUtils";
import { monthKeyOf, previousMonthKey } from "../lib/stats";
import { riskAlcoholG } from "../lib/warnings";
import { DEFAULT_DAY_START_HOUR } from "../lib/constants";
import type { DrinkingSession } from "../lib/types/firestore";

type Tab = "history" | "monthly" | "yearly" | "pattern";

const TABS: { id: Tab; label: string }[] = [
  { id: "history", label: "履歴" },
  { id: "monthly", label: "月間" },
  { id: "yearly", label: "年間" },
  { id: "pattern", label: "傾向" },
];

/** 履歴タブで一度に出す件数 */
const HISTORY_PAGE_SIZE = 30;

/**
 * 傾向と称号は「これまで全部」を見る必要がある。
 * 個人利用の想定なので上限を決め打ちで置いておく。
 */
const PATTERN_MAX_SESSIONS = 500;

export default function HistoryPage() {
  const { user, profile, loading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("history");

  const [recent, setRecent] = useState<DrinkingSession[] | null>(null);
  // 月キーごとに「その月＋前月」をまとめて持つ
  const [monthCache, setMonthCache] = useState<Record<string, DrinkingSession[]>>({});
  const [yearCache, setYearCache] = useState<Record<number, DrinkingSession[]>>({});
  const [allSessions, setAllSessions] = useState<DrinkingSession[] | null>(null);

  const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayStartHour = profile?.settings.dayStartHour ?? DEFAULT_DAY_START_HOUR;

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      if (tab === "history" && recent === null) {
        setRecent(await fetchRecentSessions(user.uid, HISTORY_PAGE_SIZE));
      }
      if (tab === "monthly" && !monthCache[monthKey]) {
        // 前月比を出すため、前月のはじめから当月の終わりまでをまとめて取る
        const from = `${previousMonthKey(monthKey)}-01`;
        const to = `${monthKey}-31`;
        const sessions = await fetchSessionsBetween(user.uid, from, to);
        setMonthCache((prev) => ({ ...prev, [monthKey]: sessions }));
      }
      if (tab === "yearly" && !yearCache[year]) {
        const sessions = await fetchSessionsBetween(user.uid, `${year}-01-01`, `${year}-12-31`);
        setYearCache((prev) => ({ ...prev, [year]: sessions }));
      }
      if (tab === "pattern" && allSessions === null) {
        setAllSessions(await fetchRecentSessions(user.uid, PATTERN_MAX_SESSIONS));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
    } finally {
      setBusy(false);
    }
  }, [user, tab, recent, monthCache, monthKey, yearCache, year, allSessions]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        読み込み中...
      </main>
    );
  }

  const risk = riskAlcoholG(profile?.sex ?? "unspecified");
  const monthSessions = monthCache[monthKey];
  const yearSessions = yearCache[year];
  const currentMonthKey = monthKeyOf(new Date());

  function shiftMonth(delta: number) {
    const [y, m] = monthKey.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    setMonthKey(monthKeyOf(date));
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-8">
      <h1 className="mb-4 text-2xl font-bold">📊 振り返る</h1>

      <div className="mb-5 flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {TABS.map((option) => (
          <button
            key={option.id}
            onClick={() => setTab(option.id)}
            className={`flex-1 rounded-lg px-2 py-2 text-sm ${
              tab === option.id ? "bg-amber-500 font-bold text-slate-950" : "text-slate-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {tab === "history" &&
        (recent === null ? (
          <p className="py-16 text-center text-slate-400">読み込み中...</p>
        ) : (
          <SessionHistoryList uid={user!.uid} sessions={recent} />
        ))}

      {tab === "monthly" && (
        <>
          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="前の月"
              className="rounded-lg border border-slate-700 p-2 text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular text-sm">{monthKey}</span>
            <button
              onClick={() => shiftMonth(1)}
              disabled={monthKey >= currentMonthKey}
              aria-label="次の月"
              className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {monthSessions === undefined ? (
            <p className="py-16 text-center text-slate-400">読み込み中...</p>
          ) : (
            <MonthlyStats
              sessions={monthSessions}
              monthKey={monthKey}
              riskAlcoholG={risk}
            />
          )}
        </>
      )}

      {tab === "yearly" &&
        (yearSessions === undefined ? (
          <p className="py-16 text-center text-slate-400">読み込み中...</p>
        ) : (
          <YearlyStats sessions={yearSessions} year={year} onChangeYear={setYear} />
        ))}

      {tab === "pattern" &&
        (allSessions === null ? (
          <p className="py-16 text-center text-slate-400">読み込み中...</p>
        ) : (
          <div className="space-y-4">
            <PatternStats sessions={allSessions} dayStartHour={dayStartHour} />
            <AchievementList sessions={allSessions} dayStartHour={dayStartHour} />
          </div>
        ))}

      {busy && <p className="mt-4 text-center text-xs text-slate-500">読み込み中...</p>}

      <BottomNav />
    </main>
  );
}
