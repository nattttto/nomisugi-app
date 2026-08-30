# 🍺 NOMISUGI

飲む量を減らすためのアプリではなく、**自分の飲み方を知る**ためのアプリ。

飲んだお酒を記録すると、純アルコール量・カロリー・アルコールの処理時間の目安が出る。
飲み過ぎそうなときは、禁止するのではなく判断材料を出して立ち止まれるようにする。

## セットアップ

### 1. Firebase プロジェクトを作る

[Firebase コンソール](https://console.firebase.google.com/) で新しいプロジェクトを作り、

- **Authentication** → Sign-in method → **メール／パスワード** を有効化
- **Cloud Firestore** → データベースを作成（本番モード）

### 2. 環境変数

Firebase コンソールの「プロジェクトの設定 → マイアプリ → ウェブアプリ」で表示される値を
`.env.local` に置く（`.env.example` を参照）。

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Vercel にデプロイするときは、同じ値を Vercel の環境変数に登録する。

### 3. セキュリティルール

`firestore.rules` の内容を Firebase コンソールの Firestore → ルール に貼り付けて公開する。

### 4. 起動

```bash
npm install
npm run dev
```

## できること（Phase 1）

- ユーザーID＋パスワードでの登録・ログイン（メールアドレスは預からない）
- プロフィール（ニックネーム・年齢・身長・体重・性別）と飲酒目標の設定
- お酒の記録（8種類 × サイズ × 数量 × 金額）
- 純アルコール量・カロリーの自動計算
- 記録する前に「これを飲むとどうなるか」のプレビュー
- アルコール処理タイマー（残量と処理完了の目安）
- 飲み過ぎ・ペースの警告
- 飲酒履歴（1回ごとの合計と内訳）

## 注意

このアプリが出す数値は、一般的な目安から計算した**推定値**です。
アルコールの分解速度には大きな個人差があり、体調・体質・食事によっても変わります。
**飲酒運転の可否を判断するために使わないでください。**
