import "server-only";
import { cacheLife } from "next/cache";

// 메모 자동 번역 (DeepL, 한국어 ↔ 영어). 키는 .env.local / Vercel 환경 변수 DEEPL_API_KEY (무료 키는 끝이 ":fx")
// 같은 글은 한 번 번역한 결과를 저장해 두고 다시 씀. 키가 없거나 실패하면 null → 화면에 구글 번역 버튼

export type Translation = { text: string } | { unavailable: true } | null; // null = 번역 필요 없음

// 화면 언어와 글 언어가 다를 때만 번역 (영어 화면 + 한글 있음 / 한국어 화면 + 한글 없이 영어만)
function needsTranslation(text: string, locale: string) {
  const hasKorean = /[가-힣]/.test(text);
  return locale === "en" ? hasKorean : !hasKorean && /[A-Za-z]{2}/.test(text);
}

async function deepl(text: string, target: "EN-US" | "KO") {
  "use cache";
  cacheLife("weeks");
  const key = process.env.DEEPL_API_KEY!;
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], target_lang: target }),
  });
  if (!res.ok) throw new Error(`deepl ${res.status}`); // 실패는 저장하지 않음
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations[0]?.text ?? "";
}

export async function translateNote(text: string, locale: string): Promise<Translation> {
  if (!text.trim() || !needsTranslation(text, locale)) return null;
  if (!process.env.DEEPL_API_KEY) return { unavailable: true };
  try {
    return { text: await deepl(text, locale === "en" ? "EN-US" : "KO") };
  } catch {
    return { unavailable: true };
  }
}
