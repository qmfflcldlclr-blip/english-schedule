// 저장 후 "돌아갈 곳" 주소 검사: 이 사이트 안의 주소만 허용 (외부 사이트로 보내는 링크 방지)
// "/\evil.com", "/\t/evil.com" 처럼 브라우저가 외부 주소로 해석하는 꼼수도 막음
const BASE = "http://internal.invalid";

export function safeInternalPath(value: unknown, fallback: string) {
  const s = typeof value === "string" ? value : "";
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\")) return fallback;
  try {
    const url = new URL(s, BASE); // 브라우저와 같은 규칙으로 해석
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search; // 해석된 결과로 다시 만들어 숨은 문자 제거
  } catch {
    return fallback;
  }
}
