"use client";

import { useEffect, useRef } from "react";
import type { DrinkingWarning } from "./warnings";

/**
 * ブラウザ通知。
 *
 * **画面を見ていないときにだけ出す。** 開いている画面には既に同じ警告が出ているので、
 * 通知を重ねても邪魔になるだけ。
 *
 * サーバーから送るプッシュ通知ではないので、アプリ（タブ／ホーム画面のアプリ）を
 * 閉じている間は届かない。飲んでいる最中は開きっぱなしになる想定でこれを選んでいる。
 * 閉じていても届く通知は FCM の登録が要るので Phase 3 以降に回す。
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | null {
  return notificationsSupported() ? Notification.permission : null;
}

/** 設定を「入」にしたときだけ呼ぶ。読み込み時に勝手に聞かない */
export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!notificationsSupported()) return null;
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

/** 通知を出す対象。info は画面で見れば足りるので通知しない */
const NOTIFY_LEVELS = new Set(["alert", "caution"]);

export function useDrinkingNotifications(enabled: boolean, warnings: DrinkingWarning[]): void {
  // 同じ警告で何度も鳴らさないよう、通知済みのIDを覚えておく
  const notified = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !notificationsSupported()) return;
    if (Notification.permission !== "granted") return;

    const currentIds = new Set(warnings.map((warning) => warning.id));
    // 消えた警告は「次に出たらまた知らせてよいもの」として忘れる
    for (const id of notified.current) {
      if (!currentIds.has(id)) notified.current.delete(id);
    }

    if (!document.hidden) return;

    for (const warning of warnings) {
      if (!NOTIFY_LEVELS.has(warning.level)) continue;
      if (notified.current.has(warning.id)) continue;
      notified.current.add(warning.id);
      try {
        new Notification(`NOMISUGI｜${warning.title}`, {
          body: warning.body,
          tag: warning.id,
        });
      } catch {
        // 通知が拒否された・作れない環境では黙って諦める
      }
    }
  }, [enabled, warnings]);
}
