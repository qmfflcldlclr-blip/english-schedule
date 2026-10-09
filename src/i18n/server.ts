import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import ko from "./messages/ko.json";
import en from "./messages/en.json";

// ko.json 의 구조를 기준으로 삼고, en.json 에 빠진 문구가 있으면 타입 오류가 나게 함
export type Messages = typeof ko;
const dictionaries: Record<Locale, Messages> = { ko, en };

// 현재 사용자의 언어: 1) 쿠키에 저장된 값 2) 브라우저 언어 (한국어가 아니면 영어)
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;

  const browser = (await headers()).get("accept-language");
  if (!browser) return defaultLocale;
  const first = browser.split(",")[0].trim().slice(0, 2).toLowerCase();
  return first === "ko" ? "ko" : "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
