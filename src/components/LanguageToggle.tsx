"use client";

import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { localeShortNames, locales, type Locale } from "@/i18n/config";

type Props = {
  current: Locale;
  labels: Record<Locale, string>;
  ariaLabel: string;
};

export default function LanguageToggle({ current, labels, ariaLabel }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-gray-300 p-0.5 text-sm"
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={active}
            disabled={pending || active}
            onClick={() => startTransition(() => setLocale(locale))}
            aria-label={labels[locale]}
            className={`min-h-10 min-w-10 rounded-full px-3 transition-colors ${
              active
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            } disabled:cursor-default`}
          >
            {/* 폰에서는 짧게(한/EN), 넓은 화면에서는 전체 이름 */}
            <span className="sm:hidden">{localeShortNames[locale]}</span>
            <span className="hidden sm:inline">{labels[locale]}</span>
          </button>
        );
      })}
    </div>
  );
}
