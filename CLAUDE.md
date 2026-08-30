# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # 開発サーバー（Turbopack）。ポートは 3400 を使う
npm run build      # 本番ビルド
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

テストフレームワークは未導入。

Firebase の API キーは `.env.local` に置く（gitignore 済み、コミット禁止）。
`.env.example` に必要なキーの一覧がある。

## コンセプト

「飲む量を減らす」ではなく「自分の飲み方を知る」ためのアプリ。
禁止も説教もせず、**判断材料（純アルコール量・カロリー・処理時間の目安）を出す**ことに徹する。

```
飲酒記録 → リアルタイム介入 → 振り返り → 自分の飲酒傾向
```

## Architecture

**Next.js 15 App Router**。すべてのページは `"use client"`。
状態は Firestore を都度読む方式（リアルタイム共有は不要なので `onSnapshot` は使っていない）。

### 画面遷移

```
/ → 未ログインなら /login、ログイン済みなら /home
/login  ⇄ /register
/home     … 今日の飲酒・目標・警告・処理タイマー・記録
/history  … 過去の飲酒（セッション一覧＋内訳）
/profile  … プロフィール・目標・設定・ログアウト
```

下部の `BottomNav` で /home・/history・/profile を行き来する。

### Key Files

| Path | Purpose |
|------|---------|
| `src/app/lib/firebase.ts` | Firebase init。`db`（Firestore）と `auth` をエクスポート |
| `src/app/lib/types/firestore.ts` | **正となる型**：`UserProfile` / `DrinkingSession` / `DrinkRecord` / `UsernameRecord` |
| `src/app/lib/firestoreUtils.ts` | 参照と CRUD。画面からは必ずここを経由する |
| `src/app/lib/constants.ts` | **健康まわりの数値と文言の一元管理**。免責文言もここ |
| `src/app/lib/alcohol.ts` | 純アルコール量・カロリー・分解時間・残量推定（純粋関数） |
| `src/app/lib/drinks.ts` | 飲料マスター（度数・kcal/100mL・サイズ） |
| `src/app/lib/drinkingDay.ts` | 「飲酒日」の境界計算 |
| `src/app/lib/warnings.ts` | 飲み過ぎ・ペースの警告判定（純粋関数） |
| `src/app/lib/username.ts` | ユーザーIDと表示名。合成メールアドレスの組み立て |
| `src/app/lib/useCurrentUser.ts` | 認証ガード＋プロフィール読み込みのフック |

計算ロジック（`alcohol.ts` / `warnings.ts` / `drinkingDay.ts`）は UI と Firestore に依存しない。
**点数ならぬ「量」の計算を画面に書かない**。

### Firestore Data Model

```
/users/{uid}                                    → UserProfile
  /sessions/{sessionId}                         → DrinkingSession（1回の飲み会）
    /records/{recordId}                         → DrinkRecord（1回の記録）
/usernames/{id小文字}                            → UsernameRecord
```

飲酒データはすべて `users/{uid}` の下に置く。セキュリティルールが
`request.auth.uid == userId` の一本で済み、配下はワイルドカード1つで守れる。

**セッションに合計値（`totalDrinks` / `totalAlcoholG` / `totalCalories` / `totalCost`）を持たせている。**
月間・年間の集計を records を読まずにセッション一覧だけで出すため。
記録の追加・取り消しは `runTransaction` で「records の書き込み」と「合計の更新」を必ず一緒に行う
（片方だけ通ると杯数と履歴が食い違い、後から直せない）。

### 飲酒日（重要）

22時に飲み始めて翌1時に終わる飲み方は普通に起きる。カレンダー上の日付で区切ると
1回の飲み会が2日に割れ、飲酒日数も二重に数えてしまう。

**午前4時（`DEFAULT_DAY_START_HOUR`）を境にした「飲酒日」で集計する**（`drinkingDay.ts`）。
`DrinkingSession.drinkingDay` は `"2026-08-30"` 形式。日付キーはローカルタイムで組み立てる
（`toISOString()` は UTC になるので使わない）。

### セッションの自動クローズ

「今日は終了」は押し忘れる前提で作る。`shouldAutoClose` が

- 最後の記録から `SESSION_AUTO_CLOSE_HOURS`（3時間）経過、または
- 飲酒日が変わった

を検出したら、ホームを開いたときに自動で閉じる。**終了時刻は最後の記録の時刻**にする
（アプリを開いたままの時間を飲酒時間に含めないため）。`closedBy` に `"auto"` を残す。

### 計算の考え方

- **純アルコール量(g) = 量(mL) × 度数(%) ÷ 100 × 0.8**。種類の違うお酒を比べるための内部単位
- **カロリーは飲料ごとの `kcalPer100ml` から出す**。「純アルコール × 7.1」だけだとビールや
  日本酒の糖質分が丸ごと抜けて2〜3割低く出る。度数を手入力する「その他」だけは
  糖質が分からないのでアルコール分から計算する
- **分解速度は `体重(kg) × 0.1 g/時`**。体重未設定なら 70kg 相当（`DEFAULT_WEIGHT_KG`）
- **残量推定（`remainingAlcoholG`）は飲んだ順に分解分を引いていく**。吸収時間は考慮していないので、
  飲み始め直後は多めに出る
- 焼酎・ウイスキーの `volumeMl` は**割る前の原液の量**（`volumeIsUndiluted`）。
  水やお湯で割っても純アルコール量は変わらない

### 目標の単位

**目標の主軸は純アルコール量(g)、杯数は補助表示**。
「4杯以内」だとビール大ジョッキとショット1杯が同じ1杯になり、目標が機能しないため。
`UserGoal.drinks` は任意の目安で、達成判定には使わない。

`DrinkingSession.goalAlcoholG` に終了時点の目標を写している。
後から目標を変えても、過去の達成判定が揺れないようにするため。

### 警告（warnings.ts）

「禁止」ではなく判断材料を出す。文言は事実と推定値に留める。

- `goal-exceeded` / `goal-near` … 目標に対して
- `risk-amount` … 厚労省ガイドラインの目安（男性40g・女性20g）に対して
- `fast-pace` … 直近の間隔が基準の 0.7 倍を切ったとき
- `long-session` … 4時間経過

**個人の平均ペースは間隔が `PERSONAL_BASELINE_MIN_SAMPLES`（20回ぶん）貯まるまで使わない。**
それまでは一般的な目安（30分/杯）で判定する。初日から「あなたの平均」を出すと嘘になるため。

個人平均は `personalPaceFromSessions`（`stats.ts`）で出す。**記録1件ずつの間隔ではなく、
終了したセッションの「飲酒時間 ÷ 杯の間隔数」から求める。** セッションのドキュメントだけで
計算できるので、過去の records を読み直さずに済む。ホームでは開いたときに直近20セッションを
1回だけ読んでこれを計算する（1杯記録するたびに変わる値ではないため）。

### 医学的な表現

**このアプリは医学的な判断をしない。** 数値はすべて「推定」「目安」として出す。

- 表示に使う免責文言は `constants.ts` の `MEDICAL_DISCLAIMER` / `DRIVING_DISCLAIMER` に集約する
- 処理タイマーの近くには必ず「飲酒運転の可否を判断するものではない」を出す
- 称号やメッセージは飲み過ぎを肯定する方向にしない

### Auth

Firebase Authentication（メール+パスワード）。**メールアドレスは預からない。**
Firebase Auth はメール必須なので、ユーザーIDから `{id小文字}@nomisugi.invalid` を組み立てて登録する
（`syntheticEmail`。`.invalid` は RFC 2606 の予約TLDで配送されない）。

- **ユーザーID**：ログイン専用。英数字+`_` 3〜20文字。`usernames/{id小文字}` のドキュメントIDで一意性を保証
- **ニックネーム（表示名）**：画面に出る名前。日本語可・12文字以内。Auth の `displayName` と
  `UserProfile.displayName` の両方に持たせる
- 合成メールがIDから一意に決まるので、**ID重複は `createUserWithEmailAndPassword` の時点で弾かれる**
- `usernames` にメールアドレスを保存しない（未認証でも読めるコレクションなので、保存すると
  「IDが分かればメールが分かる」状態になる）
- **パスワードを忘れた場合の自動復旧は無い**（リセットメールが届かないため）

### 振り返り画面（/history）

タブで4つを切り替える。**タブごとに必要な範囲だけを読み、読んだ結果はタブ単位でキャッシュする。**

| タブ | 読む範囲 | 中身 |
|------|----------|------|
| 履歴 | 直近30セッション | `SessionHistoryList`。タップで内訳を開いたときだけ records を読む |
| 月間 | 前月1日〜当月末 | `MonthlyStats`。前月比を出すため前月ぶんも一緒に取る |
| 年間 | その年の1年 | `YearlyStats`。月別グラフの指標を3つから切り替えられる |
| 傾向 | 全期間（最大500） | `PatternStats` と `AchievementList` |

`fetchSessionsBetween` は `drinkingDay`（文字列）の範囲で引く。日付キーがソート可能な形式なので、
単一フィールドの範囲検索で済み複合インデックスが要らない。月末は `"2026-09-31"` のように
実在しない日を上限にしてよい（文字列比較なので問題なく効く）。

グラフは外部ライブラリを使わず、幅を % で指定した div で描く（`BarChart`）。

### 統計の集計（stats.ts）

**セッションの合計値だけで計算する。records は読まない。**

- `summarizeSessions` … 飲酒回数・**飲酒日数（同じ飲酒日は1と数える）**・総杯数・純アルコール等
- `analyzePattern` … 曜日別・5杯目到達率・水をはさんだ回との比較・**飲み始めの平均時刻**
- 平均開始時刻は日付をまたぐので、そのまま時刻を平均すると 19時 と 1時 の平均が 10時 になる。
  飲酒日の開始時刻からの経過分に直してから平均する

### 称号（achievements.ts）

**飲んだ量を称える称号は作らない。** 「5杯目の壁突破者」のようなものは飲み過ぎの肯定になる。
称えるのは 目標を守れたこと・水をはさめたこと・休肝日をつくれたこと・記録を続けられたこと の4つだけ。

休肝日の数え方は、飲酒日どうしの間隔も「最後に飲んだ日から今日まで」も**両端を含めない**でそろえる
（今日はまだ終わっていないので数に入れない）。

### Phase

- **Phase 1（実装済み）**：認証・プロフィール・飲酒記録・純アルコール/カロリー計算・
  セッション管理・処理タイマー・飲み過ぎ警告・飲酒履歴
- **Phase 2（実装済み）**：月間/年間統計・グラフ・カレンダー・飲酒傾向分析・個人平均ペース・
  称号・PWA アイコン
- **Phase 3**：AI分析・ウェアラブル連携・通知・「今日飲み会？」モード

## UI — ステッカーポップ

Tailwind CSS。配色トークンは `tailwind.config.ts` に集約してある。
ビールの泡のようなクリーム色（`cream`）の地に、太い黒縁（`ink`）とずらした影で
「シールを貼った」質感を出す。外部 UI ライブラリは `lucide-react` のみ。

**このアプリはダークテーマを持たない。** 記録するのが億劫にならないことを最優先にしていて、
明るく親しみのある1枚絵でそろえたほうが「開く気になる」ため。

| トークン | 用途 |
|---|---|
| `cream` | 全ページの地色。カードの中の小さな区画にも使う |
| `paper` | カード・入力欄 |
| `ink` | 縁取りと本文。純黒だと硬いのでわずかに茶を含ませてある |
| `beer` | 記録ボタンなど主役。**文字色には `beer-deep` を使う** |
| `berry` | 目標超過・警告 |
| `mint` | 目標達成・良い変化 |
| `aqua` | 水・お知らせ |

**明るい地色では `beer`(#f5a623) を文字色に使わない。** コントラストが 2.1:1 しか出ない。
文字は `beer-deep`(#8a4a00) を使い、`beer` は塗りに限る。
同じ理由で、**`beer` / `berry` / `mint` / `aqua` の塗りの上の文字は白ではなく `ink`。**

押せるものには `.sticker-press`（`globals.css`）を付ける。縁＋ずらした影が付き、
押すと影が消えて沈む。**触れる場所を色ではなく影の有無で伝えている**ので、色覚に依らず分かる。
押せないカードは `.sticker-card`（縁だけ）にする。入力欄は `.sticker-field`
（フォーカスで縁の外側にビール色の輪が付く）。

**グラフやカレンダーのマスの縁は 2px** にしてカードの 3px と区別する。
同じ太さだと並んだときに縁だけが目立って、量の違いが読めなくなる。

書体は `M PLUS Rounded 1c`（`next/font/google`）。ポップさは配色より書体で決まる部分が大きい。
日本語フォントは重いので `preload: false`（unicode-range で分割配信され、使う字だけ落ちてくる）。
`font-black`(900) は読み込んでいないので使わない。太字は `font-extrabold`(800) まで。

**スマホ縦持ちが唯一の想定環境。** `max-w-md` で中央寄せする。
数字を並べる箇所には `.tabular` を付けて桁の揺れを止める。

PWA アイコンも同じ配色。配色を変えたらアイコンを作り直し、
`public/manifest.json` と `layout.tsx` の `themeColor` も合わせること。
