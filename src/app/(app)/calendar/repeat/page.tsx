import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students";
import { todayIn } from "@/lib/credit-math";
import { isDate } from "@/lib/time";
import { zoneName } from "@/config/timezones";
import { DEFAULT_LESSON_MINUTES } from "@/config/rules";
import RepeatForm from "@/components/calendar/RepeatForm";

export default async function RepeatPage({ searchParams }: PageProps<"/calendar/repeat">) {
  const [{ locale, t }, profile, students, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    listStudents(false),
    searchParams,
  ]);
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const startDate = isDate(sp.date) ? sp.date : todayIn(timeZone);
  const preset = students.find((s) => s.id === sp.student);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Link href={`/calendar?date=${startDate}`} className="inline-flex min-h-11 items-center text-sm text-gray-600">
        ← {t.calendar.title}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">{t.calendar.repeatTitle}</h1>
      {students.length === 0 ? (
        <p className="text-gray-600">{t.calendar.noStudents}</p>
      ) : (
        <RepeatForm
          t={t.calendar}
          students={students}
          zoneLabel={zoneName(timeZone, locale)}
          timeZone={timeZone}
          locale={locale}
          initial={{
            studentId: preset?.id ?? "",
            startDate,
            duration: preset?.lesson_minutes ?? DEFAULT_LESSON_MINUTES,
          }}
        />
      )}
    </main>
  );
}
