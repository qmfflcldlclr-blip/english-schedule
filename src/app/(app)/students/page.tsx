import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { listStudents } from "@/lib/students";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getCreditOverview } from "@/lib/credits";
import { todayIn } from "@/lib/credit-math";
import { EmptyStudentsArt } from "@/components/Illustrations";

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

  // 남은 횟수 + "기간 지남" 표시 (0회 이하면 빨간색)
  const Remaining = ({ id }: { id: string }) => {
    const c = creditsOf(id);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`font-semibold tabular-nums ${c.remaining <= 0 ? "text-red-600" : ""}`}>
          {format(all.credits.timesUnit, { n: c.remaining })}
        </span>
        {c.expired && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            {all.credits.expired}
          </span>
        )}
      </span>
    );
  };

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
        <>
          {/* 폰: 카드형 목록 */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3 active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name}</p>
                    {s.memo && (
                      <p className="truncate text-sm text-gray-500">{s.memo}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <Remaining id={s.id} />
                    <p className="text-xs text-gray-500">
                      {format(t.minutesUnit, { n: s.lesson_minutes })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* PC: 표 */}
          <table className="mt-4 hidden w-full text-left md:table">
            <thead className="border-b border-gray-200 text-sm text-gray-500">
              <tr>
                <th className="py-2 pr-4 font-medium">{t.name}</th>
                <th className="py-2 pr-4 font-medium">{t.remaining}</th>
                <th className="py-2 pr-4 font-medium">{t.lessonMinutes}</th>
                <th className="py-2 font-medium">{t.memo}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <Link href={`/students/${s.id}`} className="font-semibold hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <Remaining id={s.id} />
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {format(t.minutesUnit, { n: s.lesson_minutes })}
                  </td>
                  <td className="max-w-md truncate py-3 text-gray-500">{s.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
