// 지원하는 언어와 기본값을 한곳에 모아 둔 설정
export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

// 선택한 언어를 저장하는 쿠키 이름
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
