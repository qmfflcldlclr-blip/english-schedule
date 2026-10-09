import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getLesson, getOtherTimeZone } from "@/lib/lessons";
import { listStudents } from "@/lib/students";
import { formatDay, toZoned } from "@/lib/time";
import { zoneName } from "@/config/timezones";
import LessonForm from "@/components/calendar/LessonForm";
import DeleteLessonButton from "@/components/calendar/DeleteLessonButton";
import LessonTime, { statusBadge } from "@/components/calendar/LessonTime";

export default async function LessonPage({ params }: PageProps<"/calendar/lessons/[id]">) {
  const { id } = await params;
  const [{ locale, t: all }, profile, lesson, students] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getLesson(id),
    listStudents(false),
  ]);
  if (!lesson) notFound();
  const t = all.calendar;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const local = toZoned(lesson.starts_at, timeZone);
  const editable = lesson.status === "scheduled";

  // 보관된 학생의 수업이어도 선택 목록에 그 학생이 보이도록
  const options = students.some((s) => s.id === lesson.student_id)
    ? students
    : [...students, { id: lesson.student_id, name: lesson.studentName, lesson_minutes: lesson.duration_minutes }];

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Link href={`/calendar?date=${local.date}`} className="inline-flex min-h-11 items-center text-sm text-gray-600">
        ← {t.title}
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{editable ? t.editTitle : t.viewTitle}</h1>
          <p className="mt-1 text-gray-600">
            {formatDay(local.date, locale, { month: "long", day: "numeric", weekday: "short" })}{" "}
            <LessonTime
              startsAt={lesson.starts_at}
              timeZone={timeZone}
              otherTimeZone={await getOtherTimeZone(profile?.id ?? "", timeZone)}
              locale={locale}
              otherLabel={t.otherTime}
            />
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[lesson.status]}`}>
          {t.status[lesson.status]}
        </span>
      </div>

      {editable ? (
        <>
          <LessonForm
            t={t}
            students={options}
            zoneLabel={zoneName(timeZone, locale)}
            cancelHref={`/calendar?date=${local.date}`}
            initial={{
              lessonId: lesson.id,
              studentId: lesson.student_id,
              date: local.date,
              time: local.time,
              duration: lesson.duration_minutes,
              memo: lesson.memo ?? "",
            }}
          />
          <div className="mt-8 flex justify-end border-t border-gray-100 pt-4">
            <DeleteLessonButton
              lessonId={lesson.id}
              date={local.date}
              t={{ delete: t.delete, deleting: t.deleting, deleteConfirm: t.deleteConfirm, error: t.errors.delete }}
            />
          </div>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-xl border border-gray-200 p-4">
            <dt className="text-gray-500">{t.student}</dt>
            <dd>
              <Link href={`/students/${lesson.student_id}`} className="underline underline-offset-4">
                {lesson.studentName}
              </Link>
            </dd>
            <dt className="text-gray-500">{t.duration}</dt>
            <dd>{format(t.minutesUnit, { n: lesson.duration_minutes })}</dd>
            <dt className="text-gray-500">{t.memo}</dt>
            <dd className="break-words">{lesson.memo || "—"}</dd>
          </dl>
          <p className="mt-4 text-sm text-gray-500">
            {format(t.lockedNotice, { status: t.status[lesson.status] })}
          </p>
        </>
      )}
    </main>
  );
}
