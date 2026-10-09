// 번역 문구 안의 {이름} 자리에 값을 넣어 줌. 예: format("{n}분", { n: 30 }) → "30분"
export function format(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}

// 날짜를 사용자 언어·시간대에 맞춰 표시 (DB에는 UTC로 저장됨)
export function formatDate(iso: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "medium" }).format(
    new Date(iso),
  );
}
