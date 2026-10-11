// 반복 일정 계산 (데이터베이스 없이 순수 계산만)
import { addDays, fromZoned, toZoned, weekStart } from "@/lib/time";

// 요일 번호: 주의 첫날부터 0 … 6 (화면의 요일 순서와 같음, 지금은 0=일 … 6=토)
export function weekdayOf(date: string) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${weekStart(date)}T00:00:00Z`)) / 86_400_000,
  );
}

// 반복 규칙 → 수업 시작 시각 목록
// startDate 부터 weeks 주 동안, 고른 요일마다 time 에 시작 (시간대 기준)
export function generateOccurrences(opts: {
  startDate: string;
  weekdays: number[];
  time: string;
  weeks: number;
  timeZone: string;
}) {
  const days = new Set(opts.weekdays);
  const result: { date: string; startsAt: Date }[] = [];
  for (let i = 0; i < opts.weeks * 7; i++) {
    const date = addDays(opts.startDate, i);
    if (days.has(weekdayOf(date))) {
      result.push({ date, startsAt: fromZoned(date, opts.time, opts.timeZone) });
    }
  }
  return result;
}

// 지난주 복사용: 같은 요일·같은 시각으로 7일 뒤 (시간대 기준)
export function shiftOneWeek(startsAt: string, timeZone: string) {
  const local = toZoned(startsAt, timeZone);
  return fromZoned(addDays(local.date, 7), local.time, timeZone);
}
