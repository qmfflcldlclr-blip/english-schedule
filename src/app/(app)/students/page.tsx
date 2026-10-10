import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { listStudents } from "@/lib/students";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getCreditOverview } from "@/lib/credits";
import { todayIn } from "@/lib/credit-math";
import { EmptyStudentsArt } from "@/components/Illustrations";
import StudentList from "@/components/StudentList";

export default async function StudentsPage({
  searchParams,
}: PageProps<"/students">) {
  const showArchived = (await searchParams).show === "archived";
  const [{ t: all }, profile, students] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    listStudents(showArchived),
  ]);
  const t = all.students;
  const overview = await getCreditOverview(
    students.map((s) => s.id),
    todayIn(profile?.timezone ?? "UTC"),
  );
  const creditsOf = (id: string) =>
    overview.get(id) ?? { remaining: 0, expired: false };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t.title}
          <span className="ml-2 text-base font-normal text-gray-500">
            {format(t.count, { n: students.length })}
          </span>
        </h1>
        {!showArchived && (
          <Link
            href="/students/new"
            className="flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
          >
            + {t.add}
          </Link>
        )}
      </div>

      <Link
        href={showArchived ? "/students" : "/students?show=archived"}
        className="mt-2 inline-flex min-h-11 items-center text-sm text-gray-600 underline underline-offset-4"
      >
        {showArchived ? t.showActive : t.showArchived}
      </Link>

      {students.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <EmptyStudentsArt className="h-28" />
          <p className="mt-3 text-gray-500">{showArchived ? t.emptyArchived : t.empty}</p>
        </div>
      ) : (
        <StudentList
          students={students.map((st) => ({ ...st, ...creditsOf(st.id) }))}
          t={{
            search: t.search,
            noMatch: t.noMatch,
            name: t.name,
            remaining: t.remaining,
            lessonMinutes: t.lessonMinutes,
            memo: t.memo,
            minutesUnit: t.minutesUnit,
            timesUnit: all.credits.timesUnit,
            expired: all.credits.expired,
          }}
        />
      )}
    </main>
  );
}
