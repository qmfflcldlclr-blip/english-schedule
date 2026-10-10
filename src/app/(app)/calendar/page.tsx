import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getOtherTimeZone, listLessons, type Lesson } from "@/lib/lessons";
import { todayIn } from "@/lib/credit-math";
import {
  addDays,
  formatDay,
  formatDayRange,
  fromZoned,
  isDate,
  toZoned,
  weekStart,
} from "@/lib/time";
import LessonTime, { statusBadge, statusStyle } from "@/components/calendar/LessonTime";
import ZoomButton from "@/components/ZoomButton";
import { EmptyLessonsArt } from "@/components/Illustrations";
import { getSettings } from "@/lib/settings";

// PC 시간표: 기본으로 보여줄 시간 범위 (수업이 범위 밖이면 자동으로 넓어짐)
const GRID_DEFAULT_FROM = 9;
const GRID_DEFAULT_TO = 22;
const HOUR_PX = 64;

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const [{ locale, t: all }, profile, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
  ]);
  const t = all.calendar;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const today = todayIn(timeZone);
  const selected = isDate(sp.date) ? sp.date : today;
  const monday = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [lessons, otherTimeZone, settings] = await Promise.all([
    listLessons(fromZoned(monday, "00:00", timeZone), fromZoned(addDays(monday, 7), "00:00", timeZone)),
    getOtherTimeZone(profile?.id ?? "", timeZone),
    getSettings(),
  ]);

  // 날짜별로 묶기 (내 시간대 기준)
  const byDay = new Map<string, Lesson[]>(days.map((d) => [d, []]));
  for (const l of lessons) byDay.get(toZoned(l.starts_at, timeZone).date)?.push(l);

  const timeProps = { timeZone, otherTimeZone, locale, otherLabel: t.otherTime };
  const link = (date: string) => `/calendar?date=${date}`;

  // PC 시간표 범위
  let fromHour = GRID_DEFAULT_FROM;
  let toHour = GRID_DEFAULT_TO;
  for (const l of lessons) {
    const start = toZoned(l.starts_at, timeZone).minutes;
    fromHour = Math.min(fromHour, Math.floor(start / 60));
    toHour = Math.max(toHour, Math.min(24, Math.ceil((start + l.duration_minutes) / 60)));
  }
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);

  const dayLessons = byDay.get(selected) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
      {/* 주 이동 */}
      <div className="flex items-center justify-between gap-2">
        <Link href={link(addDays(selected, -7))} aria-label={t.prevWeek} className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-gray-100">
          ‹
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold">{formatDayRange(monday, days[6], locale)}</h1>
          {!days.includes(today) && (
            <Link href={link(today)} className="text-sm text-brand-700 underline underline-offset-4">
              {t.today}
            </Link>
          )}
        </div>
        <Link href={link(addDays(selected, 7))} aria-label={t.nextWeek} className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-gray-100">
          ›
        </Link>
      </div>

      {/* Zoom · 지난주 복사 · 반복 생성 */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-end">
        <ZoomButton url={settings.zoomUrl} t={all.settings} />
        <Link href={`/calendar/copy?date=${monday}`} className="flex min-h-11 items-center rounded-full border border-gray-300 bg-white px-4 text-sm">
          {t.copyWeek}
        </Link>
        <Link href={`/calendar/repeat?date=${selected}`} className="flex min-h-11 items-center rounded-full border border-gray-300 bg-white px-4 text-sm">
          {t.repeat}
        </Link>
      </div>

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
                  isSel ? "bg-brand-600 text-white" : d === today ? "bg-brand-50 text-brand-700" : "text-gray-700"
                }`}
              >
                <span className="text-xs opacity-80">{formatDay(d, locale, { weekday: "narrow" })}</span>
                <span className="font-semibold tabular-nums">{Number(d.slice(8))}</span>
                <span className={`mt-0.5 size-1.5 rounded-full ${count ? (isSel ? "bg-white" : "bg-gray-400") : "bg-transparent"}`} />
              </Link>
            );
          })}
        </nav>

        <h2 className="mt-5 text-sm font-medium text-gray-500">{formatDay(selected, locale, { month: "long", day: "numeric", weekday: "long" })}</h2>
        {dayLessons.length === 0 ? (
          <div className="mt-4 flex flex-col items-center py-4 text-center">
            <EmptyLessonsArt className="h-24" />
            <p className="mt-3 text-gray-500">{t.noLessons}</p>
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {dayLessons.map((l) => (
              <li key={l.id}>
                <Link href={`/calendar/lessons/${l.id}`} className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-4 py-3 ${statusStyle[l.status]}`}>
                  <div className="min-w-0">
                    <LessonTime startsAt={l.starts_at} {...timeProps} />
                    <p className="truncate font-medium">{l.studentName}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                    <span className="text-gray-500">{format(t.minutesUnit, { n: l.duration_minutes })}</span>
                    {l.status !== "scheduled" && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium no-underline ${statusBadge[l.status]}`}>{l.status === "absent" ? (l.cancelled_at ? t.lateCancel : t.noShow) : t.status[l.status]}</span>
                    )}
                  </div>
                </Link>
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
        <div className="mb-3 flex justify-end">
          <Link href={`/calendar/new?date=${selected}`} className="flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white">
            + {t.add}
          </Link>
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* 요일 머리글 */}
          <div className="border-b border-gray-200" />
          {days.map((d) => (
            <Link
              key={d}
              href={`/calendar/new?date=${d}`}
              title={t.add}
              className={`border-b border-l border-gray-200 py-2 text-center text-sm hover:bg-gray-50 ${d === today ? "font-semibold text-brand-700" : "text-gray-700"}`}
            >
              {formatDay(d, locale, { weekday: "short", day: "numeric" })}
            </Link>
          ))}

          {/* 시간 눈금 */}
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-gray-400 tabular-nums" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {/* 날짜별 칸 */}
          {days.map((d) => (
            <div key={d} className={`relative border-l border-gray-200 ${d === today ? "bg-brand-50/40" : ""}`} style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-gray-100" style={{ top: i * HOUR_PX }} />
              ))}
              {(byDay.get(d) ?? []).map((l) => {
                const start = toZoned(l.starts_at, timeZone).minutes;
                return (
                  <Link
                    key={l.id}
                    href={`/calendar/lessons/${l.id}`}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-xs hover:z-10 hover:shadow-md ${statusStyle[l.status]}`}
                    style={{
                      top: ((start - fromHour * 60) / 60) * HOUR_PX,
                      height: Math.max((l.duration_minutes / 60) * HOUR_PX - 2, 28),
                    }}
                  >
                    <LessonTime startsAt={l.starts_at} {...timeProps} compact />
                    <span className="block truncate font-medium">{l.studentName}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        {lessons.length === 0 && <p className="mt-4 text-center text-gray-500">{t.noLessonsWeek}</p>}
      </div>
    </main>
  );
}
