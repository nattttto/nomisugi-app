import type { Config } from "tailwindcss";

/**
 * 配色は「ステッカーポップ」1本。
 * ビールの泡のようなクリーム色の地に、太い黒縁とずらした影で貼りものの質感を出す。
 *
 * このアプリはダークテーマを持たない。
 * 記録するのが億劫にならないことを最優先にしていて、明るく親しみのある1枚絵で
 * そろえたほうが「開く気になる」ため。配色の切り替えは扱う情報も増やしてしまう。
 */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 地色。全ページの背景
        cream: "#ffeecc",
        // カード・入力欄
        paper: "#ffffff",
        // 縁取りと本文。純黒だと硬いので、わずかに茶を含ませる
        ink: "#2e1b0e",
        muted: "#7a5c46",
        faint: "#9a7c66",
        // 主役。記録ボタンと「いま選ばれているもの」
        beer: {
          // 塗りに使う明るい方
          DEFAULT: "#f5a623",
          // 文字に使う濃い方。クリーム地では DEFAULT だと 2.1:1 しか出ない
          deep: "#8a4a00",
        },
        // 目標超過・飲み過ぎの警告
        berry: {
          DEFAULT: "#ff5c62",
          deep: "#b3121f",
        },
        // 目標達成・良い変化
        mint: {
          DEFAULT: "#3ecfa0",
          deep: "#0f7a5c",
        },
        // 水・お知らせ
        aqua: {
          DEFAULT: "#5ec3ff",
          deep: "#0b6ba8",
        },
      },
      boxShadow: {
        // 縁だけ。並べても隙間が詰まらないので一覧で使う
        sticker: "0 0 0 3px #2e1b0e",
        // 縁＋ずらした影。押せるものに付ける
        pop: "0 0 0 3px #2e1b0e, 4px 4px 0 3px #2e1b0e",
        // 押し込んだ状態。影を消して沈ませる
        "pop-in": "0 0 0 3px #2e1b0e",
      },
      fontFamily: {
        rounded: ["var(--font-rounded)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
