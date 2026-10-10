// 학생 검색 규칙 (서버·브라우저 공용): 대소문자 무시 부분 일치 + 한글 초성 검색 ("ㄱㅁㅈ" → 김민준)

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

// 한글 글자를 초성으로 (가 → ㄱ). 한글이 아니면 그대로
function toChosung(text: string) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSUNG[Math.floor(code / 588)] : ch;
    })
    .join("");
}

const isAllChosung = (q: string) => [...q].every((ch) => CHOSUNG.includes(ch));

export function matchesSearch(text: string, query: string) {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return true;
  const t = text.toLowerCase().replace(/\s+/g, "");
  if (t.includes(q)) return true;
  return isAllChosung(q) && toChosung(t).includes(q);
}
