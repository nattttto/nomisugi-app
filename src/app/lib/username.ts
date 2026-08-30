/**
 * ログイン用のユーザーIDと、画面に出る表示名の扱い。
 *
 * このアプリはメールアドレスを預からない。Firebase Authentication の
 * メール+パスワード方式はメールを必須とするため、ユーザーIDから決まる
 * 「配送されないアドレス」を組み立てて使う。
 */

import { User, updateProfile } from "firebase/auth";
import { getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { getUsernameDocRef, getUsernamesCollectionRef } from "./firestoreUtils";

/** ログインに使うユーザーID。英数字とアンダースコア、3〜20文字 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

/** 画面に出る表示名の最大文字数（日本語も1文字として数える） */
export const DISPLAY_NAME_MAX_LENGTH = 12;

/** Firebase Authentication の下限に合わせる */
export const PASSWORD_MIN_LENGTH = 6;

/** .invalid は RFC 2606 で予約された、実在しないことが保証されたTLD */
const SYNTHETIC_EMAIL_DOMAIN = "nomisugi.invalid";

/** ユーザーIDに対応する Firebase Auth 用のメールアドレス */
export function syntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "ユーザーIDは英数字とアンダースコア（_）3〜20文字で入力してください。";
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "ニックネームを入力してください。";
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return `ニックネームは${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください。`;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;
  }
  return null;
}

/**
 * ユーザーIDを取得（大文字小文字を区別せず一意）し、表示名を設定する。
 * usernames/{id小文字} のドキュメントIDが一意性を保証する。
 *
 * メールアドレスは保存しない。このコレクションは未認証でも読めるため、
 * 保存すると「IDが分かればメールアドレスが分かる」状態になってしまう。
 */
export async function claimUsername(
  user: User,
  username: string,
  displayName: string,
): Promise<void> {
  const ref = getUsernameDocRef(username);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error("このユーザーIDは既に使われています。");
  }
  await setDoc(ref, {
    uid: user.uid,
    // 入力時の大文字小文字を保持したユーザーID（画面に出る表示名ではない）
    displayName: username,
  });
  await updateProfile(user, { displayName: displayName.trim() });
}

/** 表示名だけを変更する（ユーザーIDは変わらない） */
export async function updateDisplayName(user: User, displayName: string): Promise<void> {
  await updateProfile(user, { displayName: displayName.trim() });
}

/** uid からログイン用のユーザーIDを引く。IDを忘れないようにマイページで表示する */
export async function findUsernameByUid(uid: string): Promise<string | null> {
  const snap = await getDocs(
    query(getUsernamesCollectionRef(), where("uid", "==", uid), limit(1)),
  );
  const found = snap.docs[0];
  return found ? found.data().displayName || found.id : null;
}
