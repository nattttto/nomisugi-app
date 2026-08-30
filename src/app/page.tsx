"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";

/** 入口。ログイン済みならホーム、そうでなければログイン画面へ */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      router.replace(user ? "/home" : "/login");
    });
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center font-bold text-muted">
      読み込み中...
    </main>
  );
}
