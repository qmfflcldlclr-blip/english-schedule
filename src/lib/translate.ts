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

type Target = "EN-US" | "KO";

// 여러 글을 한 번에 번역 (DeepL 은 요청 1번에 50개까지)
async function deeplBatch(texts: string[], target: Target): Promise<string[]> {
  "use cache";
  cacheLife("weeks");
  const key = process.env.DEEPL_API_KEY!;
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await fetch(`https://${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts.slice(i, i + 50), target_lang: target }),
    });
    if (!res.ok) throw new Error(`deepl ${res.status}`); // 실패는 저장하지 않음
    const data = (await res.json()) as { translations: { text: string }[] };
    out.push(...data.translations.map((t) => t.text));
  }
  return out;
}

const targetOf = (locale: string): Target => (locale === "en" ? "EN-US" : "KO");
const deepl = async (text: string, target: Target) => (await deeplBatch([text], target))[0] ?? "";

export async function translateNote(text: string, locale: string): Promise<Translation> {
  if (!text.trim() || !needsTranslation(text, locale)) return null;
  if (!process.env.DEEPL_API_KEY) return { unavailable: true };
  try {
    return { text: await deepl(text, targetOf(locale)) };
  } catch {
    return { unavailable: true };
  }
}

// 학생 목록처럼 글이 많을 때: 번역이 필요한 글만 모아 한 번에 요청. 결과는 같은 순서, 번역 없으면 null
// (목록의 글이 하나라도 바뀌면 다시 요청하지만, 노트는 자주 바뀌지 않아 무료 한도에 여유가 큼)
export async function translateMany(texts: string[], locale: string): Promise<(string | null)[]> {
  const need = [...new Set(texts.filter((x) => x.trim() && needsTranslation(x, locale)))].sort();
  if (!need.length || !process.env.DEEPL_API_KEY) return texts.map(() => null);
  try {
    const done = await deeplBatch(need, targetOf(locale));
    const map = new Map(need.map((x, i) => [x, done[i]]));
    return texts.map((x) => map.get(x) ?? null);
  } catch {
    return texts.map(() => null);
  }
}
