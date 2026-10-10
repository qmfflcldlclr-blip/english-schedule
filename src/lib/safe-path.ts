// 저장 후 "돌아갈 곳" 주소 검사: 이 사이트 안의 주소만 허용 (외부 사이트로 보내는 링크 방지)
// "/\evil.com", "/\t/evil.com", "/.//evil.com" 처럼 브라우저가 외부 주소로 해석하는 꼼수도 막음
const BASE = "http://internal.invalid";

export function safeInternalPath(value: unknown, fallback: string) {
  const s = typeof value === "string" ? value : "";
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\")) return fallback;
  try {
    const url = new URL(s, BASE); // 브라우저와 같은 규칙으로 해석
    if (url.origin !== BASE) return fallback;
    // 해석된 결과로 다시 만들어 숨은 문자 제거. 단, "/.//evil.com" 처럼 정리 후에
    // "//" 로 시작하게 되는 경우가 있어 결과도 다시 검사
    const path = url.pathname + url.search;
    if (path.startsWith("//") || path.includes("\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
