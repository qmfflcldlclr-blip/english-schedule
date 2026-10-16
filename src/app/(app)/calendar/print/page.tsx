import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listLessons, type Lesson } from "@/lib/lessons";
import { listStudents } from "@/lib/students";
import { getCreditOverview } from "@/lib/credits";
import { todayIn } from "@/lib/credit-math";
import { scheduleDayStart, toScheduleDay, toZoned } from "@/lib/time";
import { zoneName } from "@/config/timezones";
import { addMonths, isMonth, monthWeeks, PAGE } from "@/lib/print-layout";
import { getHolidays } from "@/lib/holidays";
import { PrintButton, StudentPicker } from "@/components/calendar/PrintControls";
import PrintSheet, { type PrintEntry, type PrintRow } from "@/components/calendar/PrintSheet";
import { Jua } from "next/font/google";

// 인쇄 글꼴: 한컴 백제 M 과 비슷한 둥글고 굵은 무료 글꼴 (배민 주아). 한글은 글자 범위별로 필요할 때 받음
const printFont = Jua({ weight: "400", subsets: ["latin"], preload: false });

// 월간 일정 인쇄: /calendar/print?month=2026-10&student=학생ID(없으면 전체)
export default async function PrintPage({ searchParams }: PageProps<"/calendar/print">) {
  const [{ locale, t: all }, profile, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
  ]);
  const t = all.print;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const today = todayIn(timeZone);
  const month = isMonth(sp.month) ? sp.month : today.slice(0, 7);

  const weeks = monthWeeks(month);
  const [allLessons, students, holidays] = await Promise.all([
    // 수업일 기준 한 달 (새벽 수업은 전날에 포함)
    listLessons(scheduleDayStart(`${month}-01`, timeZone), scheduleDayStart(`${addMonths(month, 1)}-01`, timeZone)),
    listStudents(false),
    getHolidays(weeks[0][0], weeks.at(-1)![6]),
  ]);
  const student = students.find((s) => s.id === sp.student) ?? null;
  const lessons = student ? allLessons.filter((l) => l.student_id === student.id) : allLessons;

  // 날짜별 칸 내용 (내 시간대 기준). 취소는 줄 긋기, 결석은 표시만
  const days: Record<string, PrintEntry[]> = {};
  const entry = (l: Lesson): PrintEntry => {
    const base = { id: l.id, time: toZoned(l.starts_at, timeZone).time, name: l.studentName };
    if (l.status === "free_cancel") return { ...base, note: t.freeShort, strike: true };
    if (l.status === "absent")
      return l.cancelled_at ? { ...base, note: t.lateShort, strike: true } : { ...base, note: t.absentShort, strike: false };
    return { ...base, note: "", strike: false };
  };
  for (const l of lessons) (days[toScheduleDay(l.starts_at, timeZone).date] ??= []).push(entry(l));

  // 학생별 이번 달 횟수 (학생을 골랐으면 그 학생만, 아니면 이번 달 수업이 있는 학생)
  const rows = new Map<string, Omit<PrintRow, "id" | "remaining">>();
  const empty = (name: string) => ({ name, completed: 0, scheduled: 0, free: 0, absent: 0 });
  if (student) rows.set(student.id, empty(student.label));
  for (const l of lessons) {
    const r = rows.get(l.student_id) ?? empty(l.studentName);
    r[l.status === "free_cancel" ? "free" : l.status]++;
    rows.set(l.student_id, r);
  }
  const overview = await getCreditOverview([...rows.keys()], today);
  const summary: PrintRow[] = [...rows.entries()]
    .map(([id, r]) => ({ id, ...r, remaining: overview.get(id)?.remaining ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  const monthTitle = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
  const link = (m: string) => `/calendar/print?month=${m}${student ? `&student=${student.id}` : ""}`;

  return (
    <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-4 print:m-0 print:max-w-none print:p-0 ${printFont.className}`}>
      {/* 종이 크기·여백 (인쇄할 때 적용) */}
      <style>{`@page { size: A4 landscape; margin: ${PAGE.margin}mm; }`}</style>

      {/* ───── 화면 전용: 고르는 곳 ───── */}
      <div className="print:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/calendar?date=${month}-01`} className="flex min-h-11 items-center text-sm text-gray-600">
            ‹ {t.back}
          </Link>
          <h1 className="text-lg font-bold">{t.title}</h1>
          <span className="w-16" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-between">
          <div className="flex items-center gap-1">
            <Link href={link(addMonths(month, -1))} aria-label={t.prevMonth} className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-gray-100">
              ‹
            </Link>
            <span className="min-w-28 text-center font-semibold">{monthTitle}</span>
            <Link href={link(addMonths(month, 1))} aria-label={t.nextMonth} className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-gray-100">
              ›
            </Link>
          </div>
          <StudentPicker
            month={month}
            selected={student?.id ?? ""}
            students={students.map((s) => ({ id: s.id, name: s.label }))}
            label={t.student}
            allLabel={t.allStudents}
          />
          <PrintButton label={t.printNow} />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500 md:text-left">{t.hint}</p>
      </div>

      {/* ───── 종이 미리보기 두 장 (폰에서는 이 상자만 옆으로 밀어서 봄) ───── */}
      <div className="mt-4 overflow-x-auto pb-2 print:mt-0 print:overflow-visible print:p-0">
        <PrintSheet
          month={month}
          heading={`${monthTitle} · ${student ? student.label : t.allStudents}`}
          meta={`${format(t.timeZoneNote, { zone: zoneName(timeZone, locale) })} · ${format(t.printedAt, { date: today })}`}
          days={days}
          holidays={Object.fromEntries(Object.entries(holidays).map(([d, hs]) => [d, hs.map((h) => h.name).join(", ")]))}
          summary={summary}
          t={t}
          weekdayNames={all.calendar.weekdayNames}
          timesUnit={all.credits.timesUnit}
        />
      </div>
    </main>
  );
}
