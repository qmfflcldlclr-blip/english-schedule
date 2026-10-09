"use client";

import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

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
            className={`rounded-full px-3 py-1.5 transition-colors ${
              active
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            } disabled:cursor-default`}
          >
            {labels[locale]}
          </button>
        );
      })}
    </div>
  );
}
