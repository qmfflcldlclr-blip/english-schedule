import { Suspense } from "react";
import { getDictionary } from "@/i18n/server";
import LanguageToggle from "@/components/LanguageToggle";
import { LoginHero, Logo } from "@/components/Illustrations";
import LoginForm from "./LoginForm";

async function Login() {
  const { locale, t } = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-10 md:justify-center md:py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <LanguageToggle
            current={locale}
            labels={t.language}
            ariaLabel={t.language.label}
          />
        </div>
        <LoginHero className="mx-auto mt-4 w-full max-w-xs" />
        <p className="mt-2 text-center text-sm font-medium text-brand-700">{t.app.description}</p>

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">{t.auth.loginTitle}</h1>
          <LoginForm t={t.auth} />
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4" />}>
      <Login />
    </Suspense>
  );
}
