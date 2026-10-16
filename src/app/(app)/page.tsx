import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getOtherTimeZone, listLessons, withMemoTranslations } from "@/lib/lessons";
import { addDays, formatDay, scheduleDayStart, scheduleToday, toZoned } from "@/lib/time";
import LessonTime, { statusBadge, statusStyle } from "@/components/calendar/LessonTime";
import { EmptyLessonsArt, GreetingArt, type DayPart } from "@/components/Illustrations";
import NoteCard from "@/components/NoteCard";
import { getStaffNotes } from "@/lib/notes";
import { translateNote } from "@/lib/translate";
import { listLowCreditStudents } from "@/lib/students";
import { getPlanTimelines, spanDay } from "@/lib/plan-timelines";
import { LOW_CREDIT_THRESHOLD } from "@/config/rules";

// 내 시간대 기준: 12시 전 아침, 18시 전 오후, 그 뒤 저녁
function dayPart(minutes: number): DayPart {
  return minutes < 12 * 60 ? "morning" : minutes < 18 * 60 ? "afternoon" : "evening";
}

export default async function Home() {
  const [{ locale, t }, profile] = await Promise.all([getDictionary(), getCurrentProfile()]);
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const today = scheduleToday(timeZone); // 새벽 수업은 전날에 포함
  const now = new Date();

  const [todayLessons, otherTimeZone, notes, lowCredit] = await Promise.all([
    listLessons(scheduleDayStart(today, timeZone), scheduleDayStart(addDays(today, 1), timeZone)),
    getOtherTimeZone(profile?.id ?? "", timeZone),
    getStaffNotes(),
    listLowCreditStudents(LOW_CREDIT_THRESHOLD),
  ]);
  const [lessons, timelines] = await Promise.all([
    withMemoTranslations(todayLessons, locale), // 수업 노트 번역
    getPlanTimelines(lowCredit.map((s) => s.id)), // 공지: 횟수가 끝나는 날 (마지막 플랜의 종료)
  ]);
  const endOf = (id: string) => {
    const last = timelines.get(id)?.spans.at(-1);
    return last?.end ? spanDay(last.end, last.endProjected, timeZone, t.students) : null;
  };
  // 메모 자동 번역 (화면 언어와 다른 글만)
  const translations = await Promise.all(notes.map((n) => translateNote(n.content, locale)));
  // 메모 수정 시각 "10/10 16:20" (내 시간대)
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${Number(z.date.slice(5, 7))}/${Number(z.date.slice(8))} ${z.time}`;
  };
  const active = lessons.filter((l) => l.status === "scheduled" || l.status === "completed");
  // 다음 수업: 아직 끝나지 않은 예정 수업 중 가장 빠른 것
  const next = lessons.find(
    (l) => l.status === "scheduled" && new Date(l.starts_at).getTime() + l.duration_minutes * 60_000 > now.getTime(),
  );

  const part = dayPart(toZoned(now, timeZone).minutes);
  const name = profile?.display_name ?? "";
  const timeProps = { timeZone, otherTimeZone, locale, otherLabel: t.calendar.otherTime };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 md:py-8">
      {/* 인사 카드 */}
      <section
        className={`relative overflow-hidden rounded-3xl p-5 shadow-sm md:p-7 ${
          part === "evening" ? "bg-brand-800 text-white" : "bg-linear-to-br from-brand-100 to-sunny-100 text-brand-900"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${part === "evening" ? "text-brand-200" : "text-brand-700"}`}>
              {formatDay(today, locale, { month: "long", day: "numeric", weekday: "long" })}
            </p>
            <h1 className="mt-1 text-2xl leading-snug font-extrabold md:text-3xl">{format(t.home[part], { name })}</h1>
            <p className={`mt-2 font-medium ${part === "evening" ? "text-brand-100" : "text-brand-800"}`}>
              {active.length === 0
                ? t.home.noLessons
                : active.length === 1
                  ? t.home.todayCountOne
                  : format(t.home.todayCount, { n: active.length })}
            </p>
          </div>
          <GreetingArt part={part} className="size-20 shrink-0 md:size-24" />
        </div>

        {next ? (
          <Link
            href={`/calendar/lessons/${next.id}`}
            className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-2 text-gray-900 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-600">{t.home.nextLesson}</p>
              <p className="truncate">
                <LessonTime startsAt={next.starts_at} {...timeProps} />
                <span className="ml-2 font-semibold">{next.studentName}</span>
              </p>
            </div>
            <span aria-hidden className="text-xl text-brand-500">›</span>
          </Link>
        ) : (
          active.length > 0 && (
            <p className="mt-4 rounded-2xl bg-white/90 px-4 py-3 font-medium text-gray-900">🎉 {t.home.allDone}</p>
          )
        )}
      </section>

      {/* 사용 설명서 */}
      <Link
        href="/guide"
        className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-sm hover:bg-brand-50"
      >
        <span className="min-w-0">
          <span className="block font-bold text-brand-800">{t.home.guide}</span>
          <span className="block truncate text-sm text-gray-500">{t.home.guideHint}</span>
        </span>
        <span aria-hidden className="text-xl text-brand-500">›</span>
      </Link>

      {/* 공지: 남은 횟수가 얼마 안 남은 학생 */}
      {lowCredit.length > 0 && (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 className="font-bold text-amber-900">
            📢 {t.home.lowCreditTitle}
            <span className="ml-2 text-sm font-normal text-amber-700">{format(t.home.lowCreditHint, { n: LOW_CREDIT_THRESHOLD })}</span>
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {lowCredit.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex min-h-10 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-sm hover:bg-amber-100"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className={`tabular-nums ${s.remaining <= 0 ? "font-semibold text-red-600" : "text-amber-700"}`}>
                    {format(t.home.lowCreditItem, { n: s.remaining })}
                  </span>
                  {endOf(s.id) && <span className="text-xs text-red-700">· {t.students.endsOn} {endOf(s.id)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 서로 남기는 메모 (매니저 · 선생님 각자 한 칸) */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {notes.map((n, i) => (
          <NoteCard
            key={n.ownerId}
            title={`${n.role === "manager" ? t.notes.manager : t.notes.teacher} · ${n.name}`}
            content={n.content}
            updatedLabel={n.updatedAt ? format(t.notes.updated, { time: stamp(n.updatedAt) }) : null}
            editable={n.ownerId === profile?.id}
            accent={n.role === "manager" ? "brand" : "sunny"}
            locale={locale}
            translation={translations[i]}
            t={t.notes}
          />
        ))}
      </div>

      {/* 오늘 수업 목록 */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t.home.todayTitle}</h2>
        <Link href="/calendar" className="flex min-h-11 items-center px-1 text-sm font-medium text-brand-700">
          {t.home.openCalendar} ›
        </Link>
      </div>
      {lessons.length === 0 ? (
        <div className="mt-2 flex flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-white px-4 py-8 text-center">
          <EmptyLessonsArt className="h-24" />
          <p className="mt-3 font-medium text-gray-700">{t.home.noLessons}</p>
          <p className="mt-1 text-sm text-gray-500">{t.home.noLessonsHint}</p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/calendar/lessons/${l.id}`}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm ${statusStyle[l.status]} ${l.memo ? "border-l-4 border-l-amber-400" : ""}`}
              >
                <div className="min-w-0">
                  <LessonTime startsAt={l.starts_at} {...timeProps} />
                  <p className="truncate font-medium">{l.studentName}</p>
                  {/* 오늘 수업 노트 */}
                  {l.memo && <p className="mt-0.5 line-clamp-2 text-sm text-amber-800">📝 {l.memoT || l.memo}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                  <span className="text-gray-500">{format(t.calendar.minutesUnit, { n: l.duration_minutes })}</span>
                  {l.status !== "scheduled" && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[l.status]}`}>
                      {l.status === "absent"
                        ? l.cancelled_at
                          ? t.calendar.lateCancel
                          : t.calendar.noShow
                        : t.calendar.status[l.status]}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
