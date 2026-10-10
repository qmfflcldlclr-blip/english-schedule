import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students";
import { todayIn } from "@/lib/credit-math";
import { isDate, isTime } from "@/lib/time";
import { zoneName } from "@/config/timezones";
import { DEFAULT_LESSON_MINUTES, LESSON_MINUTES_MAX, LESSON_MINUTES_MIN } from "@/config/rules";
import LessonForm from "@/components/calendar/LessonForm";

export default async function NewLessonPage({ searchParams }: PageProps<"/calendar/new">) {
  const [{ locale, t }, profile, students, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    listStudents(false),
    searchParams,
  ]);
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const date = isDate(sp.date) ? sp.date : todayIn(timeZone);
  const preset = students.find((s) => s.id === sp.student);
  // 달력에서 더블클릭·드래그로 넘어오면 시간(·길이)이 주소에 들어 있음
  const time = isTime(sp.time) ? sp.time : "16:00";
  const dragged = Number(sp.duration);
  const draggedOk = Number.isInteger(dragged) && dragged >= LESSON_MINUTES_MIN && dragged <= LESSON_MINUTES_MAX;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t.calendar.newTitle}</h1>
      {students.length === 0 ? (
        <p className="text-gray-600">
          {t.calendar.noStudents}{" "}
          <Link href="/students/new" className="underline underline-offset-4">
            {t.students.add}
          </Link>
        </p>
      ) : (
        <LessonForm
          t={t.calendar}
          students={students.map((s) => ({ ...s, name: s.label }))}
          zoneLabel={zoneName(timeZone, locale)}
          cancelHref={`/calendar?date=${date}`}
          keepDuration={draggedOk}
          initial={{
            studentId: preset?.id ?? "",
            date,
            time,
            duration: draggedOk ? dragged : (preset?.lesson_minutes ?? DEFAULT_LESSON_MINUTES),
            memo: "",
          }}
        />
      )}
    </main>
  );
}
