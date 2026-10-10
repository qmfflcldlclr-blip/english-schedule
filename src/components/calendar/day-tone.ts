// 날짜 글자 색: 공휴일·일요일 빨강, 토요일 파랑 (달력·폰 날짜 줄·인쇄 공용)
export type DayTone = "red" | "blue" | "normal";

export function dayTone(date: string, holiday: boolean): DayTone {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=일 … 6=토
  if (holiday || weekday === 0) return "red";
  return weekday === 6 ? "blue" : "normal";
}

export const toneText: Record<DayTone, string> = {
  red: "text-red-600",
  blue: "text-blue-600",
  normal: "",
};
