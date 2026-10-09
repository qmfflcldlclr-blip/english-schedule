import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { logout } from "@/lib/auth-actions";
import LanguageToggle from "@/components/LanguageToggle";
import { BottomNav, TopNav } from "@/components/NavLinks";

// 로그인 후 모든 화면에 공통으로 붙는 틀: 위쪽 머리글 + 메뉴(PC는 위, 폰은 아래)
async function Shell({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, profile] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
  ]);
  if (!profile) redirect("/login");

  const items = [
    { href: "/", label: t.nav.home, icon: "home" as const },
    { href: "/calendar", label: t.nav.calendar, icon: "calendar" as const },
    { href: "/students", label: t.nav.students, icon: "students" as const },
    { href: "/settings", label: t.nav.settings, icon: "settings" as const },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="truncate text-lg font-semibold">
            {t.app.title}
          </Link>
          <TopNav items={items} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageToggle
            current={locale}
            labels={t.language}
            ariaLabel={t.language.label}
          />
          <form action={logout}>
            <button
              type="submit"
              className="min-h-11 rounded-full px-3 text-sm text-gray-600 hover:bg-gray-100"
            >
              {t.auth.logout}
            </button>
          </form>
        </div>
      </header>
      {/* 폰에서는 아래 메뉴에 내용이 가리지 않게 아래 여백 */}
      <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <BottomNav items={items} label={t.nav.label} />
    </>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="p-4" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
