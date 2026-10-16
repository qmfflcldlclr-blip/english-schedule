// PC 주간 시간표 (일~토 × 시간). 빈 시간 더블클릭·드래그로 추가, 수업 칸 누르면 옆 칸에 수업 정보, 예정 수업 칸 끌면 옮기기
import Link from "next/link";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { Lesson } from "@/lib/lessons";
import { flag, type Holiday } from "@/lib/holidays";
import { formatDay, toScheduleDay, toZoned } from "@/lib/time";
import { CALENDAR_END_HOUR, CALENDAR_RANGE_TIME_ZONE, CALENDAR_START_HOUR, DAY_CUTOFF_HOUR, HOUR_PX } from "@/config/schedule";
import LessonTime, { MarkBadge, markRing, statusStyle } from "@/components/calendar/LessonTime";
import type { LessonMark } from "@/lib/plan-timeline";
import DaySlots from "@/components/calendar/DaySlots";
import DayAttendButton from "@/components/calendar/DayAttendButton";
import LessonQuick from "@/components/calendar/LessonQuick";
import { dayTone, toneText } from "@/components/calendar/day-tone";

// 내 시간대가 기준 시간대(한국)보다 몇 시간 빠른지/늦은지 (필리핀 = -1)
function hourShift(timeZone: string, date: string) {
  const at = new Date(`${date}T12:00:00Z`);
  const mine = toZoned(at, timeZone);
  const base = toZoned(at, CALENDAR_RANGE_TIME_ZONE);
  const dayDiff = (Date.parse(mine.date) - Date.parse(base.date)) / 86_400_000; // 날짜가 넘어가는 시간대 대비
  return Math.round((mine.minutes - base.minutes) / 60 + dayDiff * 24);
}

// 이보다 낮은 수업 칸은 "시간 이름" 한 줄로 (15·20분 수업)
const ONE_LINE_BELOW_PX = 44;

type Props = {
  days: string[]; // 한 주 7일 (WEEK_STARTS_ON 부터)
  today: string;
  byDay: Record<string, Lesson[]>; // 수업일별 수업
  feedbackIds?: string[]; // 피드백이 있는 수업 (💬 표시)
  marks?: Record<string, LessonMark>; // 플랜 시작·종료 수업
  holidays: Record<string, Holiday[]>;
  timeZone: string;
  otherTimeZone: string | null;
  locale: string;
  t: Messages["calendar"];
};

export default function WeekGrid({ days, today, byDay, feedbackIds = [], marks = {}, holidays, timeZone, otherTimeZone, locale, t }: Props) {
  const hasFeedback = new Set(feedbackIds);
  const lessons = days.flatMap((d) => byDay[d] ?? []);
  const timeProps = { timeZone, otherTimeZone, locale, otherLabel: t.otherTime };
  const tone = (d: string) => toneText[dayTone(d, Boolean(holidays[d]))];
  const moveLabels = { confirmMove: t.confirmMove, moveOverlap: t.moveOverlap, moveFailed: t.moveFailed, overlapItem: t.overlapItem };
  const holidayText = (d: string) => (holidays[d] ?? []).map((h) => `${flag[h.country]} ${h.name}`).join(" · ");

  // 시간 범위 (한국 17시 ~ 다음 날 1시를 내 시간대로 옮김, 범위 밖 수업이 있으면 넓힘)
  const shift = hourShift(timeZone, days[0]);
  let fromHour = CALENDAR_START_HOUR + shift;
  let toHour = CALENDAR_END_HOUR + shift;
  for (const l of lessons) {
    const start = toScheduleDay(l.starts_at, timeZone).minutes;
    fromHour = Math.min(fromHour, Math.floor(start / 60));
    toHour = Math.max(toHour, Math.min(24 + DAY_CUTOFF_HOUR, Math.ceil((start + l.duration_minutes) / 60)));
  }
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);

  return (
    <>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 요일 머리글 (공휴일·일요일 빨강, 토요일 파랑) */}
        <div className="border-b border-gray-200" />
        {days.map((d) => (
          <div key={d} className={`flex min-w-0 flex-col items-center justify-center border-b border-l border-gray-200 px-1 py-1.5 text-center text-sm ${d === today ? "bg-brand-50 font-bold" : ""} ${tone(d) || "text-gray-700"}`}>
            <span className="flex items-center gap-1">
              <Link href={`/calendar/new?date=${d}`} title={t.add} className="rounded px-1 hover:bg-gray-100">
                {formatDay(d, locale, { weekday: "short", day: "numeric" })}
              </Link>
              {/* 그날 예정 수업 한 번에 출석 */}
              <DayAttendButton
                ids={(byDay[d] ?? []).filter((l) => l.status === "scheduled").map((l) => l.id)}
                dayLabel={formatDay(d, locale, { month: "long", day: "numeric", weekday: "short" })}
                labels={t.dayAttend}
              />
            </span>
            {holidays[d] && (
              <span title={holidayText(d)} className="block w-full truncate text-[11px] font-medium">
                {holidayText(d)}
              </span>
            )}
          </div>
        ))}

        {/* 시간 눈금 (24시 넘으면 01:00 처럼) */}
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-gray-400 tabular-nums" style={{ top: i * HOUR_PX }}>
              {i === 0 ? "" : `${String(h % 24).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>

        {/* 날짜별 칸 */}
        {days.map((d) => (
          <div key={d} data-day={d} className={`relative border-l border-gray-200 ${d === today ? "bg-brand-50/40" : ""}`} style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div key={h} className={`absolute inset-x-0 border-t ${h === 24 ? "border-gray-300 border-dashed" : "border-gray-100"}`} style={{ top: i * HOUR_PX }} />
            ))}
            <DaySlots date={d} fromHour={fromHour} toHour={toHour} hourPx={HOUR_PX} hint={t.slotHint} minutesUnit={t.minutesUnit} />
            {(byDay[d] ?? []).map((l) => {
              const start = toScheduleDay(l.starts_at, timeZone).minutes;
              const height = Math.max((l.duration_minutes / 60) * HOUR_PX - 2, 24);
              const oneLine = height < ONE_LINE_BELOW_PX;
              const time = toZoned(l.starts_at, timeZone).time;
              const minutes = format(t.minutesUnit, { n: l.duration_minutes });
              return (
                <LessonQuick
                  key={l.id}
                  lessonId={l.id}
                  studentId={l.student_id}
                  scheduled={l.status === "scheduled"}
                  move={{ date: d, minutes: start, duration: l.duration_minutes, fromHour, hourPx: HOUR_PX, studentName: l.studentName, locale, labels: moveLabels }}
                  title={`${time} ${l.studentName} · ${minutes}${l.memo ? `
📝 ${l.memoT || l.memo}` : ""}`}
                  className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 text-xs shadow-sm hover:z-10 hover:shadow-md ${oneLine ? "flex items-center gap-1 leading-none" : "py-1"} ${statusStyle[l.status]} ${l.memo ? "border-l-4 border-l-amber-400" : ""} ${marks[l.id] ? markRing[marks[l.id]] : ""}`}
                  style={{ top: ((start - fromHour * 60) / 60) * HOUR_PX, height }}
                >
                  {oneLine ? (
                    <>
                      <span className="shrink-0 font-semibold tabular-nums">{time}</span>
                      <MarkBadge mark={marks[l.id]} t={t} />
                      <span className="shrink-0 font-medium">{l.studentName}</span>
                      {/* 수업 노트는 이름 옆에 (누르면 옆 칸에 전체) */}
                      {l.memo && <span className="min-w-0 truncate text-amber-800">📝 {l.memoT || l.memo}</span>}
                      <span className="ml-auto shrink-0 pl-1 text-[11px] opacity-70">
                        {hasFeedback.has(l.id) && "💬 "}
                        {minutes}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="absolute top-1 right-1.5 text-[11px] opacity-70">
                        {hasFeedback.has(l.id) && "💬 "}
                        {minutes}
                      </span>
                      <LessonTime startsAt={l.starts_at} {...timeProps} compact />
                      <span className="flex min-w-0 items-center gap-1 font-medium">
                        <MarkBadge mark={marks[l.id]} t={t} />
                        <span className="truncate">{l.studentName}</span>
                        {l.memo && <span className="min-w-0 truncate font-normal text-amber-800">📝 {l.memoT || l.memo}</span>}
                      </span>
                    </>
                  )}
                </LessonQuick>
              );
            })}
          </div>
        ))}
      </div>
      {lessons.length === 0 && <p className="mt-4 text-center text-gray-500">{t.noLessonsWeek}</p>}
      <p className="mt-2 text-center text-sm text-gray-500">💡 {t.slotHint}</p>
    </>
  );
}
