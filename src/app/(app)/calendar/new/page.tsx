import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students";
import { todayIn } from "@/lib/credit-math";
import { isDate } from "@/lib/time";
import { zoneName } from "@/config/timezones";
import { DEFAULT_LESSON_MINUTES } from "@/config/rules";
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
          students={students}
          zoneLabel={zoneName(timeZone, locale)}
          cancelHref={`/calendar?date=${date}`}
          initial={{
            studentId: preset?.id ?? "",
            date,
            time: "16:00",
            duration: preset?.lesson_minutes ?? DEFAULT_LESSON_MINUTES,
            memo: "",
          }}
        />
      )}
    </main>
  );
}
