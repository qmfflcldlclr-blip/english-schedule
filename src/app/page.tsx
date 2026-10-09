import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { logout } from "@/lib/auth-actions";
import LanguageToggle from "@/components/LanguageToggle";

// 쿠키(언어·로그인)를 읽는 부분은 요청마다 달라지므로 Suspense 안에서 그림
async function Home() {
  const [{ locale, t }, profile] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
  ]);
  if (!profile) redirect("/login");

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <h1 className="truncate text-lg font-semibold">{t.app.title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle
            current={locale}
            labels={t.language}
            ariaLabel={t.language.label}
          />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              {t.auth.logout}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h2 className="text-2xl font-bold">
          {t.home.greeting.replace("{name}", profile.display_name)}
        </h2>
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
