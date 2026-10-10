import type { Metadata, Viewport } from "next";
import { defaultLocale, LOCALE_COOKIE } from "@/i18n/config";
// 한글 글꼴 Pretendard: 화면에 쓰인 글자 묶음만 내려받는 "나눠 받기" 버전
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andy English",
  applicationName: "Andy English",
  appleWebApp: { title: "Andy English", statusBarStyle: "default" },
  description: "1:1 online English class schedule & credit management",
};

// 아이폰 홈 바·노치 영역까지 화면을 쓰고, 하단 메뉴가 가려지지 않게 여백을 따로 줌
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#f5f9fe" };

// <html lang> 을 쿠키의 언어로 맞춰 주는 짧은 스크립트 (화면이 그려지기 전에 실행)
const setHtmlLang = `try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(ko|en)/);if(m)document.documentElement.lang=m[1]}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={defaultLocale}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setHtmlLang }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
