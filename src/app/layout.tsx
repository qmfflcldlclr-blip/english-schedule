import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { defaultLocale, LOCALE_COOKIE } from "@/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English Class Schedule",
  description: "1:1 online English class schedule & credit management",
};

// <html lang> 을 쿠키의 언어로 맞춰 주는 짧은 스크립트 (화면이 그려지기 전에 실행)
const setHtmlLang = `try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(ko|en)/);if(m)document.documentElement.lang=m[1]}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={defaultLocale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setHtmlLang }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
