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
  toZoned,
  weekStart,
} from "@/lib/time";
import LessonTime, { statusBadge, statusStyle } from "@/components/calendar/LessonTime";
import WeekGrid from "@/components/calendar/WeekGrid";
import { EmptyLessonsArt } from "@/components/Illustrations";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import LessonQuick from "@/components/calendar/LessonQuick";
import { quickLabels, statusText } from "@/components/calendar/quick-labels";
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

  const [lessons, otherTimeZone, settings, holidays] = await Promise.all([
    // 수업일 기준 한 주 (첫날 새벽 5시 ~ 다음 주 첫날 새벽 5시)
    listLessons(scheduleDayStart(weekFirst, timeZone), scheduleDayStart(addDays(weekFirst, 7), timeZone)),
    getOtherTimeZone(profile?.id ?? "", timeZone),
    getSettings(),
    getHolidays(weekFirst, days[6]),
  ]);

  // 수업일별로 묶기 (내 시간대 기준, 새벽 수업은 전날)
  const byDay = new Map<string, Lesson[]>(days.map((d) => [d, []]));
  for (const l of lessons) byDay.get(toScheduleDay(l.starts_at, timeZone).date)?.push(l);
  const tone = (d: string) => toneText[dayTone(d, Boolean(holidays[d]))];
  const holidayText = (d: string) => (holidays[d] ?? []).map((h) => `${flag[h.country]} ${h.name}`).join(" · ");

  const timeProps = { timeZone, otherTimeZone, locale, otherLabel: t.otherTime };
  const link = (date: string) => `/calendar?date=${date}`;

  const dayLessons = byDay.get(selected) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
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
                  scheduled={l.status === "scheduled"}
                  heading={`${toZoned(l.starts_at, timeZone).time} · ${l.studentName}`}
                  sub={`${format(t.minutesUnit, { n: l.duration_minutes })} · ${statusText(l, t)}`}
                  labels={quickLabels(t)}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 ${statusStyle[l.status]}`}
                >
                  <div className="min-w-0">
                    <LessonTime startsAt={l.starts_at} {...timeProps} />
                    <p className="truncate font-medium">{l.studentName}</p>
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
        <Link
          href={`/calendar/new?date=${selected}`}
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex min-h-12 items-center rounded-full bg-brand-600 px-5 font-medium text-white shadow-lg"
        >
          + {t.add}
        </Link>
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
    </main>
  );
}
