import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getOtherTimeZone, listLessons, type Lesson } from "@/lib/lessons";
import {
  addDays,
  formatDay,
  isDate,
  scheduleDayStart,
  scheduleToday,
  toScheduleDay,
  weekStart,
} from "@/lib/time";
import LessonTime, { statusBadge, statusStyle } from "@/components/calendar/LessonTime";
import WeekGrid from "@/components/calendar/WeekGrid";
import { EmptyLessonsArt } from "@/components/Illustrations";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import LessonQuick from "@/components/calendar/LessonQuick";
import { statusText } from "@/components/calendar/quick-labels";
import { CalendarPanelProvider } from "@/components/calendar/panel-context";
import SidePanel from "@/components/calendar/SidePanel";
import AddLessonButton, { OverviewButton } from "@/components/calendar/AddLessonButton";
import type { MonthSummary } from "@/components/calendar/SidePanel";
import { addMonths } from "@/lib/print-layout";
import { listStudents } from "@/lib/students";
import { zoneName } from "@/config/timezones";
import { dayTone, toneText } from "@/components/calendar/day-tone";
import { getSettings } from "@/lib/settings";
import { flag, getHolidays } from "@/lib/holidays";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const [{ locale, t: all }, profile, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
  ]);
  const t = all.calendar;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const today = scheduleToday(timeZone); // 새벽 1시라면 아직 "어제"
  const selected = isDate(sp.date) ? sp.date : today;
  const weekFirst = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekFirst, i));

  const month = selected.slice(0, 7);
  const [lessons, otherTimeZone, settings, holidays, students, monthLessons] = await Promise.all([
    // 수업일 기준 한 주 (첫날 새벽 5시 ~ 다음 주 첫날 새벽 5시)
    listLessons(scheduleDayStart(weekFirst, timeZone), scheduleDayStart(addDays(weekFirst, 7), timeZone)),
    getOtherTimeZone(profile?.id ?? "", timeZone),
    getSettings(),
    getHolidays(weekFirst, days[6]),
    listStudents(false),
    // 이번 달 현황용 (수업일 기준 한 달)
    listLessons(scheduleDayStart(`${month}-01`, timeZone), scheduleDayStart(`${addMonths(month, 1)}-01`, timeZone)),
  ]);

  // 수업일별로 묶기 (내 시간대 기준, 새벽 수업은 전날)
  const byDay = new Map<string, Lesson[]>(days.map((d) => [d, []]));
  for (const l of lessons) byDay.get(toScheduleDay(l.starts_at, timeZone).date)?.push(l);
  const tone = (d: string) => toneText[dayTone(d, Boolean(holidays[d]))];
  const holidayText = (d: string) => (holidays[d] ?? []).map((h) => `${flag[h.country]} ${h.name}`).join(" · ");

  const timeProps = { timeZone, otherTimeZone, locale, otherLabel: t.otherTime };
  const link = (date: string) => `/calendar?date=${date}`;

  const dayLessons = byDay.get(selected) ?? [];

  // 옆 칸: 이번 달 현황 (취소(연기)는 횟수·시간에서 뺌)
  const counted = monthLessons.filter((l) => l.status !== "free_cancel");
  const lengths = new Map<number, number>();
  for (const l of counted) lengths.set(l.duration_minutes, (lengths.get(l.duration_minutes) ?? 0) + 1);
  const summary: MonthSummary = {
    month,
    lessons: counted.length,
    minutes: counted.reduce((sum, l) => sum + l.duration_minutes, 0),
    doneMinutes: counted.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.duration_minutes, 0),
    byMinutes: [...lengths].sort((a, b) => a[0] - b[0]),
    completed: monthLessons.filter((l) => l.status === "completed").length,
    scheduled: monthLessons.filter((l) => l.status === "scheduled").length,
    absent: monthLessons.filter((l) => l.status === "absent").length,
    cancelled: monthLessons.length - counted.length,
  };

  // 옆 칸: 학생 고르기 목록(동명이인 번호 포함), 이번 주 수업 학생(이름순)
  const studentOptions = students.map((s) => ({ id: s.id, name: s.label, lesson_minutes: s.lesson_minutes }));
  const weekStudents = [...new Map(lessons.map((l) => [l.student_id, { id: l.student_id, name: l.studentName }])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 lg:max-w-[88rem]">
      <CalendarPanelProvider>
        {/* 넓은 PC: 왼쪽 달력 + 오른쪽 옆 칸 / 그보다 좁으면 옆 칸은 아래에서 올라오는 창 */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-4">
          <div className="min-w-0">
            <CalendarHeader
              weekFirst={weekFirst}
              weekLast={days[6]}
              selected={selected}
              showToday={!days.includes(today)}
              today={today}
              locale={locale}
              zoomUrl={settings.zoomUrl}
              t={t}
              settingsT={all.settings}
            />

            {/* ───── 폰: 날짜 줄 + 그날 목록 ───── */}
            <div className="md:hidden">
              <nav className="mt-3 grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const count = byDay.get(d)?.length ?? 0;
                  const isSel = d === selected;
                  return (
                    <Link
                      key={d}
                      href={link(d)}
                      aria-current={isSel ? "date" : undefined}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-sm ${
                        isSel ? "bg-brand-600 text-white" : `${d === today ? "bg-brand-50 ring-1 ring-brand-200" : ""} ${tone(d) || "text-gray-700"}`
                      }`}
                    >
                      <span className="text-xs opacity-80">{formatDay(d, locale, { weekday: "narrow" })}</span>
                      <span className="font-semibold tabular-nums">{Number(d.slice(8))}</span>
                      <span className={`mt-0.5 size-1.5 rounded-full ${count ? (isSel ? "bg-white" : "bg-gray-400") : "bg-transparent"}`} />
                    </Link>
                  );
                })}
              </nav>

              {/* 폰: 이번 달 현황·학생 검색을 아래 창으로 */}
              <OverviewButton
                label={t.panel.overview}
                className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-sm font-medium text-brand-700"
              />

              <h2 className={`mt-5 text-sm font-medium ${tone(selected) || "text-gray-500"}`}>
                {formatDay(selected, locale, { month: "long", day: "numeric", weekday: "long" })}
                {holidays[selected] && <span className="ml-2">{holidayText(selected)}</span>}
              </h2>
              {dayLessons.length === 0 ? (
                <div className="mt-4 flex flex-col items-center py-4 text-center">
                  <EmptyLessonsArt className="h-24" />
                  <p className="mt-3 text-gray-500">{t.noLessons}</p>
                </div>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {dayLessons.map((l) => (
                    <li key={l.id}>
                      <LessonQuick
                        lessonId={l.id}
                        studentId={l.student_id}
                        scheduled={l.status === "scheduled"}
                        className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 ${statusStyle[l.status]}`}
                      >
                        <div className="min-w-0">
                          <LessonTime startsAt={l.starts_at} {...timeProps} />
                          <p className="truncate font-medium">
                            {l.studentName}
                            {l.memo && <span className="ml-1.5 font-normal text-gray-500">· {l.memo}</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                          <span className="text-gray-500">{format(t.minutesUnit, { n: l.duration_minutes })}</span>
                          {l.status !== "scheduled" && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium no-underline ${statusBadge[l.status]}`}>{statusText(l, t)}</span>
                          )}
                        </div>
                      </LessonQuick>
                    </li>
                  ))}
                </ul>
              )}

              {/* 폰 하단 메뉴 위에 떠 있는 추가 버튼 */}
              <AddLessonButton
                date={selected}
                label={t.add}
                className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex min-h-12 items-center rounded-full bg-brand-600 px-5 font-medium text-white shadow-lg"
              />
            </div>

            {/* ───── PC: 주간 시간표 ───── */}
            <div className="mt-4 hidden md:block">
              <WeekGrid
                days={days}
                today={today}
                byDay={Object.fromEntries(byDay)}
                holidays={holidays}
                timeZone={timeZone}
                otherTimeZone={otherTimeZone}
                locale={locale}
                t={t}
              />
            </div>
          </div>

          <SidePanel
            t={t}
            students={studentOptions}
            weekStudents={weekStudents}
            days={days}
            selected={selected}
            timeZone={timeZone}
            otherTimeZone={otherTimeZone}
            locale={locale}
            zoneLabel={zoneName(timeZone, locale)}
            summary={summary}
          />
        </div>
      </CalendarPanelProvider>
    </main>
  );
}
