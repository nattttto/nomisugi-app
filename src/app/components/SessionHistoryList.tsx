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
    return (
      <p className="py-16 text-center font-bold text-muted">まだ記録がありません。</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const open = openId === session.id;
        const endAt = session.endAt?.toDate() ?? null;
        const durationMs = endAt ? endAt.getTime() - session.startAt.toMillis() : null;
        const records = recordsBySession[session.id];

        return (
          <li key={session.id} className="sticker-card overflow-hidden">
            <button
              onClick={() => toggle(session)}
              className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="font-extrabold">{formatDayLabel(session.drinkingDay)}</p>
                <p className="tabular mt-1 text-sm font-bold text-muted">
                  🍺 {session.totalDrinks} 杯 ／ {formatGrams(session.totalAlcoholG)}g ／{" "}
                  {formatInt(session.totalCalories)} kcal
                </p>
              </div>
              {open ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-muted" strokeWidth={3} />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={3} />
              )}
            </button>

            {open && (
              <div className="border-t-[3px] border-dotted border-ink/25 px-5 py-4">
                <dl className="mb-4 grid grid-cols-2 gap-3 text-sm font-bold">
                  <div>
                    <dt className="text-xs text-muted">飲酒時間</dt>
                    <dd className="tabular">
                      {formatTime(session.startAt.toDate())}
                      {endAt ? ` 〜 ${formatTime(endAt)}` : " 〜 （記録中）"}
                    </dd>
                  </div>
                  {durationMs !== null && (
                    <div>
                      <dt className="text-xs text-muted">合計</dt>
                      <dd className="tabular">{formatDuration(durationMs)}</dd>
                    </div>
                  )}
                  {session.waterCount > 0 && (
                    <div>
                      <dt className="text-xs text-muted">水</dt>
                      <dd className="tabular">💧 {session.waterCount} 杯</dd>
                    </div>
                  )}
                  {session.totalCost > 0 && (
                    <div>
                      <dt className="text-xs text-muted">金額</dt>
                      <dd className="tabular">{formatYen(session.totalCost)}</dd>
                    </div>
                  )}
                  {session.goalAlcoholG !== null && (
                    <div>
                      <dt className="text-xs text-muted">目標</dt>
                      <dd
                        className={
                          session.totalAlcoholG <= session.goalAlcoholG
                            ? "text-mint-deep"
                            : "text-berry-deep"
                        }
                      >
                        {session.goalAlcoholG}g ／{" "}
                        {session.totalAlcoholG <= session.goalAlcoholG ? "達成" : "超過"}
                      </dd>
                    </div>
                  )}
                  {session.closedBy === "auto" && (
                    <div className="col-span-2">
                      <dd className="text-xs font-bold text-muted">
                        終了の操作が無かったため、最後の記録の時刻で自動的に終了しています。
                      </dd>
                    </div>
                  )}
                </dl>

                {records === undefined ? (
                  <p className="text-sm font-bold text-muted">内訳を読み込み中...</p>
                ) : (
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
                            <span className="ml-1 text-xs text-muted">{record.sizeLabel}</span>
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
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
