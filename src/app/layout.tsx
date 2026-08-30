import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import PwaRegister from "./components/PwaRegister";
import "./globals.css";

/**
 * 丸ゴシック。ポップさは配色より書体で決まる部分が大きい。
 *
 * 日本語フォントは全部入りだと重いので preload させない
 * （unicode-range で分割配信されるため、実際に使う字だけが落ちてくる）。
 * 900 は読み込んでいないので font-black は使わない。太字は font-extrabold まで。
 */
const rounded = M_PLUS_Rounded_1c({
  weight: ["400", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-rounded",
});

export const metadata: Metadata = {
  title: "NOMISUGI",
  description:
    "飲む量を減らすのではなく、自分の飲み方を知るための飲酒管理アプリ。純アルコール量・カロリー・処理時間の目安を記録して振り返る。",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "NOMISUGI",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffeecc",
  initialScale: 1,
  width: "device-width",
  // ホーム画面から開いたとき、ノッチの下に文字が潜らないようにする
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={rounded.variable}>
      <body className="font-rounded antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
