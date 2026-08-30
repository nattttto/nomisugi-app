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
import {
  fetchRecentRestDays,
  fetchRecentSessions,
  fetchRestDaysBetween,
  fetchSessionsBetween,
} from "../lib/firestoreUtils";
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
  // 休肝日は日付キーの配列。月ごとと、称号用の全期間ぶんを持つ
  const [restDayMonthCache, setRestDayMonthCache] = useState<Record<string, string[]>>({});
  const [allRestDays, setAllRestDays] = useState<string[] | null>(null);

  const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  const dayStartHour = profile?.settings.dayStartHour ?? DEFAULT_DAY_START_HOUR;

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      if (tab === "history" && recent === null) {
        setRecent(await fetchRecentSessions(user.uid, HISTORY_PAGE_SIZE));
      }
      if (tab === "monthly" && !monthCache[monthKey]) {
        // 前月比を出すため、前月のはじめから当月の終わりまでをまとめて取る
        const from = `${previousMonthKey(monthKey)}-01`;
        const to = `${monthKey}-31`;
        const [sessions, restDays] = await Promise.all([
          fetchSessionsBetween(user.uid, from, to),
          fetchRestDaysBetween(user.uid, `${monthKey}-01`, `${monthKey}-31`),
        ]);
        setMonthCache((prev) => ({ ...prev, [monthKey]: sessions }));
        setRestDayMonthCache((prev) => ({ ...prev, [monthKey]: restDays }));
      }
      if (tab === "yearly" && !yearCache[year]) {
        const sessions = await fetchSessionsBetween(user.uid, `${year}-01-01`, `${year}-12-31`);
        setYearCache((prev) => ({ ...prev, [year]: sessions }));
      }
      if (tab === "pattern" && allSessions === null) {
        const [sessions, restDays] = await Promise.all([
          fetchRecentSessions(user.uid, PATTERN_MAX_SESSIONS),
          fetchRecentRestDays(user.uid, PATTERN_MAX_SESSIONS),
        ]);
        setAllSessions(sessions);
        setAllRestDays(restDays);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
    }
  }, [user, tab, recent, monthCache, monthKey, yearCache, year, allSessions]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center font-bold text-muted">
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

  const loadingText = (
    <p className="py-16 text-center font-bold text-muted">読み込み中...</p>
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-32 pt-8">
      <h1 className="mb-5">
        <span className="inline-block -rotate-2 rounded-xl bg-beer px-4 py-2 text-xl font-extrabold text-ink shadow-pop">
          📊 振り返る
        </span>
      </h1>

      <div className="mb-5 flex gap-1 rounded-2xl bg-paper p-1.5 shadow-sticker">
        {TABS.map((option) => (
          <button
            key={option.id}
            onClick={() => setTab(option.id)}
            className={`flex-1 rounded-xl px-2 py-2 text-sm font-extrabold ${
              tab === option.id ? "bg-beer text-ink shadow-sticker" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-berry px-3 py-2 text-sm font-bold text-ink shadow-sticker">
          {error}
        </p>
      )}

      {tab === "history" &&
        (recent === null ? loadingText : <SessionHistoryList uid={user!.uid} sessions={recent} />)}

      {tab === "monthly" && (
        <>
          <div className="mb-4 flex items-center justify-center gap-3">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="前の月"
              className="sticker-press rounded-xl bg-paper p-2"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={3} />
            </button>
            <span className="tabular text-sm font-extrabold">{monthKey}</span>
            <button
              onClick={() => shiftMonth(1)}
              disabled={monthKey >= currentMonthKey}
              aria-label="次の月"
              className="sticker-press rounded-xl bg-paper p-2 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
          {monthSessions === undefined ? (
            loadingText
          ) : (
            <MonthlyStats
              sessions={monthSessions}
              monthKey={monthKey}
              riskAlcoholG={risk}
              restDays={restDayMonthCache[monthKey] ?? []}
            />
          )}
        </>
      )}

      {tab === "yearly" &&
        (yearSessions === undefined ? (
          loadingText
        ) : (
          <YearlyStats sessions={yearSessions} year={year} onChangeYear={setYear} />
        ))}

      {tab === "pattern" &&
        (allSessions === null ? (
          loadingText
        ) : (
          <div className="space-y-4">
            <PatternStats sessions={allSessions} dayStartHour={dayStartHour} />
            <AchievementList sessions={allSessions} restDayKeys={allRestDays ?? []} />
          </div>
        ))}

      <BottomNav />
    </main>
  );
}
