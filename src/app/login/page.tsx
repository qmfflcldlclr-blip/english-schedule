import { Suspense } from "react";
import { getDictionary } from "@/i18n/server";
import LanguageToggle from "@/components/LanguageToggle";
import LoginForm from "./LoginForm";

async function Login() {
  const { locale, t } = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-end">
          <LanguageToggle
            current={locale}
            labels={t.language}
            ariaLabel={t.language.label}
          />
        </div>
        <h1 className="text-2xl font-bold">{t.app.title}</h1>
        <p className="mb-8 mt-1 text-gray-600">{t.auth.loginTitle}</p>
        <LoginForm t={t.auth} />
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
