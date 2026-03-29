import type { Metadata } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EX-MGMT Pro — 중장비 통합 관리 시스템",
  description: "중장비 작업, 장비, 업체 통합 관리 및 보고서 시스템",
  robots: { index: false, follow: false },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${noto.variable} ${jetbrains.variable} dark font-normal`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme + font size before paint — prevents flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('exmgmt_theme') || 'dark';
            var f = localStorage.getItem('exmgmt_font')  || 'normal';
            var r = document.documentElement;
            r.classList.remove('dark','light');
            r.classList.add(t);
            r.classList.remove('font-normal','font-large','font-xlarge');
            r.classList.add('font-' + f);
          } catch(e){}
        `}} />
      </head>
      <body className="font-sans antialiased bg-bg text-tx min-h-screen">
        {children}
      </body>
    </html>
  );
}
