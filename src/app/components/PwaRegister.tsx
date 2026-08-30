"use client";

import { useEffect } from "react";

/**
 * Service Worker を登録して、ホーム画面に追加できるようにする。
 *
 * manifest とアイコンだけでは「ホーム画面に追加」の要件を満たさない。
 * fetch を扱う Service Worker が要る。
 *
 * 開発中は登録しない。古いバンドルをキャッシュから掴んで、
 * コードを直したのに反映されない、という紛らわしい状態になるため。
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // 登録に失敗してもアプリは普通に動く。ホーム画面に追加できないだけ
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
