"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { fetchUserProfile } from "./firestoreUtils";
import type { UserProfile } from "./types/firestore";

/**
 * ログイン中のユーザーとプロフィールをまとめて読む。
 *
 * 未ログインなら /login へ飛ばす。プロフィールが無い（登録の途中で
 * 中断した等）場合は /profile で作り直させる。
 */
export function useCurrentUser(): {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setProfile: (profile: UserProfile) => void;
} {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        router.replace("/login");
        return;
      }
      setUser(nextUser);
      try {
        setProfile(await fetchUserProfile(nextUser.uid));
      } catch {
        // 通信に失敗しても画面は出す。プロフィール依存の表示だけが欠ける
        setProfile(null);
      }
      setLoading(false);
    });
  }, [router]);

  return { user, profile, loading, setProfile };
}
