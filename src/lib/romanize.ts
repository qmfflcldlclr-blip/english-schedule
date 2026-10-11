// 한글 이름 → 로마자 (영어 화면에서 영어 이름이 비어 있을 때 자동으로 보여 줌, 서버·브라우저 공용)
// 국어의 로마자 표기법을 글자 하나씩 적용 (이름은 보통 소리 나는 대로 바꾸지 않음) + 흔한 성씨는 관용 표기
// 예) 나상현 → Na Sanghyeon, 김준아 → Kim Juna, 이서원 → Lee Seowon
// 마음에 들지 않으면 학생 정보에서 영어 이름을 직접 입력 (예: 앤디 → Andy)

const INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINALS = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const RIEUL_FINAL = 8; // 받침 ㄹ
const RIEUL_INITIAL = 5; // 첫소리 ㄹ

// 흔한 성씨의 관용 표기 (여권 등에서 많이 쓰는 형태)
const SURNAMES: Record<string, string> = {
  김: "Kim", 이: "Lee", 박: "Park", 최: "Choi", 정: "Jung", 강: "Kang", 조: "Cho", 윤: "Yoon", 장: "Jang",
  임: "Lim", 한: "Han", 오: "Oh", 서: "Seo", 신: "Shin", 권: "Kwon", 황: "Hwang", 안: "Ahn", 송: "Song",
  류: "Ryu", 유: "Yoo", 홍: "Hong", 전: "Jeon", 고: "Ko", 문: "Moon", 양: "Yang", 손: "Son", 배: "Bae",
  백: "Baek", 허: "Heo", 남: "Nam", 심: "Shim", 노: "Noh", 하: "Ha", 곽: "Kwak", 성: "Sung", 차: "Cha",
  주: "Joo", 우: "Woo", 구: "Koo", 나: "Na", 민: "Min", 진: "Jin", 지: "Ji", 엄: "Um", 채: "Chae",
  원: "Won", 천: "Cheon", 방: "Bang", 공: "Kong", 현: "Hyun", 함: "Ham", 변: "Byun", 염: "Yeom",
  여: "Yeo", 추: "Choo", 도: "Do", 소: "So", 석: "Seok", 선: "Sun", 설: "Seol", 마: "Ma", 길: "Gil",
  연: "Yeon", 위: "Wi", 표: "Pyo", 명: "Myung", 기: "Ki", 반: "Ban", 왕: "Wang", 금: "Keum", 옥: "Ok",
  육: "Yuk", 인: "In", 맹: "Maeng", 제: "Je", 모: "Mo", 탁: "Tak", 국: "Kook", 은: "Eun", 편: "Pyeon",
  용: "Yong", 남궁: "Namgoong", 황보: "Hwangbo", 제갈: "Jegal", 선우: "Sunwoo", 독고: "Dokgo",
};

const isHangul = (ch: string) => ch >= "가" && ch <= "힣";
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// 한글 글자들을 이어서 로마자로 (한글이 아닌 글자는 그대로)
function romanizeWord(word: string) {
  let out = "";
  let prevFinal = -1;
  for (const ch of word) {
    if (!isHangul(ch)) {
      out += ch;
      prevFinal = -1;
      continue;
    }
    const code = ch.charCodeAt(0) - 0xac00;
    const initial = Math.floor(code / 588);
    const vowel = Math.floor((code % 588) / 28);
    const final = code % 28;
    // ㄹ받침 다음 ㄹ은 "ll" (예: 별라 → byeolla), 그 밖의 첫소리 ㄹ은 "r"
    const head = initial === RIEUL_INITIAL && prevFinal === RIEUL_FINAL ? "l" : INITIALS[initial];
    out += head + VOWELS[vowel] + FINALS[final];
    prevFinal = final;
  }
  return out;
}

export function romanizeName(name: string): string {
  const trimmed = name.trim();
  if (!/[가-힣]/.test(trimmed)) return trimmed; // 한글이 없으면 그대로
  // 학부모: "임민우맘" → "Lim Minu Mom"
  if (trimmed.length >= 3 && trimmed.endsWith("맘")) return `${romanizeName(trimmed.slice(0, -1))} Mom`;
  // 띄어 쓴 이름은 낱말마다 바꿈 (예: "김 민준" → "Kim Minjun")
  if (/\s/.test(trimmed)) {
    return trimmed
      .split(/\s+/)
      .map((w, i) => (i === 0 && SURNAMES[w]) || capitalize(romanizeWord(w)))
      .join(" ");
  }
  const chars = [...trimmed];
  const allHangul = chars.every(isHangul);
  if (allHangul && chars.length >= 2 && chars.length <= 4) {
    // 두 글자 성씨(남궁 등) 먼저, 그다음 한 글자 성씨
    const two = chars.length >= 3 ? chars.slice(0, 2).join("") : "";
    const [surname, given] = SURNAMES[two]
      ? [SURNAMES[two], chars.slice(2).join("")]
      : SURNAMES[chars[0]]
        ? [SURNAMES[chars[0]], chars.slice(1).join("")]
        : [null, ""];
    if (surname) return `${surname} ${capitalize(romanizeWord(given))}`;
  }
  return capitalize(romanizeWord(trimmed)); // 성씨를 알 수 없으면 한 낱말로 (예: 앤디 → Aendi)
}
