"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fetchRecords } from "../lib/firestoreUtils";
import type { DrinkRecord, DrinkingSession } from "../lib/types/firestore";
import { formatDayLabel } from "../lib/drinkingDay";
import { formatDuration, formatGrams, formatInt, formatTime, formatYen } from "../lib/format";
import { findDrinkType } from "../lib/drinks";

interface Props {
  uid: string;
  sessions: DrinkingSession[];
}

export default function SessionHistoryList({ uid, sessions }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // 開いたセッションの内訳だけを読む。全部まとめて読むと無駄な通信になる
  const [recordsBySession, setRecordsBySession] = useState<Record<string, DrinkRecord[]>>({});

  async function toggle(session: DrinkingSession) {
    if (openId === session.id) {
      setOpenId(null);
      return;
    }
    setOpenId(session.id);
    if (!recordsBySession[session.id]) {
      const records = await fetchRecords(uid, session.id);
      setRecordsBySession((prev) => ({ ...prev, [session.id]: records }));
    }
  }

  if (sessions.length === 0) {
    return <p className="py-16 text-center text-slate-400">まだ記録がありません。</p>;
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const open = openId === session.id;
        const endAt = session.endAt?.toDate() ?? null;
        const durationMs = endAt ? endAt.getTime() - session.startAt.toMillis() : null;
        const records = recordsBySession[session.id];

        return (
          <li
            key={session.id}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"
          >
            <button
              onClick={() => toggle(session)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <p className="font-bold">{formatDayLabel(session.drinkingDay)}</p>
                <p className="tabular mt-1 text-sm text-slate-400">
                  🍺 {session.totalDrinks} 杯 / {formatGrams(session.totalAlcoholG)}g /{" "}
                  {formatInt(session.totalCalories)} kcal
                </p>
              </div>
              {open ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
              )}
            </button>

            {open && (
              <div className="border-t border-slate-800 px-5 py-4">
                <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">飲酒時間</dt>
                    <dd className="tabular">
                      {formatTime(session.startAt.toDate())}
                      {endAt ? ` 〜 ${formatTime(endAt)}` : " 〜 （記録中）"}
                    </dd>
                  </div>
                  {durationMs !== null && (
                    <div>
                      <dt className="text-xs text-slate-500">合計</dt>
                      <dd className="tabular">{formatDuration(durationMs)}</dd>
                    </div>
                  )}
                  {session.waterCount > 0 && (
                    <div>
                      <dt className="text-xs text-slate-500">水</dt>
                      <dd className="tabular">💧 {session.waterCount} 杯</dd>
                    </div>
                  )}
                  {session.totalCost > 0 && (
                    <div>
                      <dt className="text-xs text-slate-500">金額</dt>
                      <dd className="tabular">{formatYen(session.totalCost)}</dd>
                    </div>
                  )}
                  {session.goalAlcoholG !== null && (
                    <div>
                      <dt className="text-xs text-slate-500">目標</dt>
                      <dd
                        className={
                          session.totalAlcoholG <= session.goalAlcoholG
                            ? "text-emerald-300"
                            : "text-red-300"
                        }
                      >
                        {session.goalAlcoholG}g /{" "}
                        {session.totalAlcoholG <= session.goalAlcoholG ? "達成" : "超過"}
                      </dd>
                    </div>
                  )}
                  {session.closedBy === "auto" && (
                    <div className="col-span-2">
                      <dd className="text-xs text-slate-500">
                        終了の操作が無かったため、最後の記録の時刻で自動的に終了しています。
                      </dd>
                    </div>
                  )}
                </dl>

                {records === undefined ? (
                  <p className="text-sm text-slate-500">内訳を読み込み中...</p>
                ) : (
                  <ul className="space-y-2">
                    {records.map((record) => (
                      <li key={record.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{findDrinkType(record.drinkTypeId)?.emoji ?? "🍹"}</span>
                          <span>
                            {record.drinkLabel}
                            <span className="ml-1 text-xs text-slate-500">
                              {record.sizeLabel}
                            </span>
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
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
