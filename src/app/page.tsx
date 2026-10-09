import { Suspense } from "react";
import { getDictionary } from "@/i18n/server";
import LanguageToggle from "@/components/LanguageToggle";

// 쿠키(언어 설정)를 읽는 부분은 요청마다 달라지므로 Suspense 안에서 그림
async function Home() {
  const { locale, t } = await getDictionary();

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">{t.app.title}</h1>
        <LanguageToggle
          current={locale}
          labels={t.language}
          ariaLabel={t.language.label}
        />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h2 className="text-2xl font-bold">{t.home.welcome}</h2>
        <p className="mt-2 text-gray-600">{t.home.comingSoon}</p>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4" />}>
      <Home />
    </Suspense>
  );
}
