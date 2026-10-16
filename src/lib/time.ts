// 시간대 변환 도우미 (서버·브라우저 공용, 외부 라이브러리 없음)
// 날짜는 "YYYY-MM-DD", 시각은 "HH:mm" 문자열로 다룸

import { DAY_CUTOFF_HOUR, WEEK_STARTS_ON } from "@/config/schedule";

const pad = (n: number) => String(n).padStart(2, "0");

// 특정 순간을 그 시간대의 달력 날짜·시각으로
export function toZoned(instant: Date | string, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { date, time, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// 그 시간대의 "날짜 + 시각" → 실제 순간(UTC)
export function fromZoned(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  // 시간대 차이를 구해 보정 (서머타임이 있는 지역도 맞도록 두 번 확인)
  let guess = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    const z = toZoned(new Date(guess), timeZone);
    const [zy, zm, zd] = z.date.split("-").map(Number);
    const shownAsUtc = Date.UTC(zy, zm - 1, zd, Math.floor(z.minutes / 60), z.minutes % 60);
    guess += wallAsUtc - shownAsUtc;
  }
  return new Date(guess);
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

// 그 날짜가 속한 주의 첫날 (WEEK_STARTS_ON 요일)
export function weekStart(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 … 6=토
  return addDays(date, -((weekday - WEEK_STARTS_ON + 7) % 7));
}

export function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// 날짜 문자열을 언어에 맞게 표시 (예: "10월 8일 (수)" / "Wed, Oct 8")
export function formatDay(
  date: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", weekday: "short" },
) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function formatDayRange(from: string, to: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).formatRange(new Date(`${from}T00:00:00Z`), new Date(`${to}T00:00:00Z`));
}

// ─── 화면용 "수업일" (새벽 수업은 전날 칸에 이어서) ───
// 순간 → 수업일 날짜와, 그 날 0시부터 센 분 (예: 다음 날 00:30 → 24:30 = 1470분)
export function toScheduleDay(instant: Date | string, timeZone: string) {
  const z = toZoned(instant, timeZone);
  if (z.minutes < DAY_CUTOFF_HOUR * 60) {
    return { date: addDays(z.date, -1), minutes: z.minutes + 24 * 60, time: z.time };
  }
  return z;
}

// 수업일이 시작되는 순간 (그 날짜의 DAY_CUTOFF_HOUR 시)
export function scheduleDayStart(date: string, timeZone: string) {
  return fromZoned(date, `${pad(DAY_CUTOFF_HOUR)}:00`, timeZone);
}

// "오늘" 날짜: 자정(0시)에 바로 바뀜 (새벽 수업을 전날 칸에 그리는 것과는 별개)
export function scheduleToday(timeZone: string) {
  return toZoned(new Date(), timeZone).date;
}

// 수업일 + 그 날 0시부터 센 분 → 실제 날짜·시각 (1470분 → 다음 날 "00:30")
export function scheduleToActual(date: string, minutes: number) {
  const dayShift = Math.floor(minutes / (24 * 60));
  const m = minutes - dayShift * 24 * 60;
  return { date: addDays(date, dayShift), time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}` };
}
