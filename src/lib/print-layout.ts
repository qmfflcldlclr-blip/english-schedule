// 월간 일정 인쇄: A4 가로 두 장(1쪽 달력, 2쪽 이번 달 횟수 표)에 맞추는 계산 (서버·브라우저 공용, 외부 라이브러리 없음)
// 길이 단위는 모두 mm

import { addDays, weekStart } from "@/lib/time";

// 종이: A4 가로 297×210, 여백 7mm → 내용 영역 283×196
export const PAGE = { width: 283, height: 196, margin: 7 };

const HEADER_H = 10; // 제목 줄
const WEEKDAY_H = 5; // 요일 머리글
const DATE_LINE_H = 3.6; // 칸 위쪽 날짜 숫자 줄
const CELL_PAD_H = 1.2; // 칸 위아래 여백
const MIN_LINES = 2; // 수업이 없는 주도 너무 납작해지지 않게
const TWO_COLS_FROM = 7; // 하루 수업이 이 개수 이상인 주는 칸 안을 두 줄로 나란히
const FONT_MIN = 1.55; // 약 4.4pt — 이보다 작으면 읽기 어려움
const FONT_MAX = 3.2; // 약 9pt
const LINE_RATIO = 1.25; // 줄 높이 = 글자 크기 × 1.25
const SAFETY = 3; // 표 테두리 두께·반올림 오차로 넘치지 않게 남겨 두는 여유

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 그 달을 덮는 주(월요일 시작) 목록. 각 주는 날짜 7개, 다른 달 날짜도 들어 있음
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const next = `${addMonths(month, 1)}-01`;
  const weeks: string[][] = [];
  for (let monday = weekStart(first); monday < next; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  }
  return weeks;
}

export type Fit = {
  fontMm: number; // 수업 글자 크기
  weekCols: number[]; // 주마다 칸 안 단 수 (1 또는 2)
  weekHeights: number[]; // 주마다 줄 높이
  scale: number; // 글자를 최소로 줄여도 넘칠 때 종이 전체 축소 비율 (1 = 축소 없음)
};

// 1쪽 달력. maxPerWeek: 주마다 "가장 수업이 많은 날의 수업 수"
export function fitCalendar(maxPerWeek: number[]): Fit {
  const weekCols = maxPerWeek.map((n) => (n >= TWO_COLS_FROM ? 2 : 1));
  const weekLines = maxPerWeek.map((n, i) => Math.max(MIN_LINES, Math.ceil(n / weekCols[i])));
  const totalLines = weekLines.reduce((a, b) => a + b, 0);

  const fixed = HEADER_H + WEEKDAY_H + maxPerWeek.length * (DATE_LINE_H + CELL_PAD_H);
  const lineH = (PAGE.height - fixed) / Math.max(totalLines, 1);
  const fontMm = Math.min(FONT_MAX, Math.max(FONT_MIN, lineH / LINE_RATIO));
  const used = fontMm * LINE_RATIO;
  const scale = Math.min(1, (PAGE.height - SAFETY) / (fixed + totalLines * used));

  // 남는 높이는 주마다 고르게 나눠서 달력이 종이를 꽉 채우게
  const natural = weekLines.map((l) => DATE_LINE_H + CELL_PAD_H + l * used);
  const spare = Math.max(0, PAGE.height - SAFETY - HEADER_H - WEEKDAY_H - natural.reduce((a, b) => a + b, 0));
  const weekHeights = natural.map((h) => h + spare / natural.length);

  return { fontMm, weekCols, weekHeights, scale };
}

// 2쪽 횟수 표: 학생 수에 맞춰 단 수와 줄 높이·글자 크기 (한 장 안)
export function fitSummary(rows: number) {
  const available = PAGE.height - HEADER_H - 12 - SAFETY; // 제목 + 합계 줄
  const cols = rows > 72 ? 3 : rows > 30 ? 2 : 1;
  const perCol = Math.max(1, Math.ceil(rows / cols));
  const rowMm = Math.min(6.5, available / (perCol + 1) - 0.3); // +1 = 표 머리글, -0.3 = 줄마다 테두리
  return { cols, perCol, rowMm, fontMm: Math.min(3.4, rowMm * 0.55) };
}
