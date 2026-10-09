import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { format, formatDate } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getStudent } from "@/lib/students";
import { getStudentCredits } from "@/lib/credits";
import { todayIn } from "@/lib/credit-math";
import ArchiveButton from "@/components/ArchiveButton";
import CreditSection from "@/components/CreditSection";

export default async function StudentDetailPage({
  params,
}: PageProps<"/students/[id]">) {
  const { id } = await params;
  const [{ locale, t: all }, profile, student] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    getStudent(id),
  ]);
  if (!student) notFound();
  const t = all.students;
  const timeZone = profile?.timezone ?? "UTC";
  const credits = await getStudentCredits(student.id, todayIn(timeZone));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href={student.archived ? "/students?show=archived" : "/students"}
        className="inline-flex min-h-11 items-center text-sm text-gray-600"
      >
        ← {t.backToList}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="min-w-0 break-words text-2xl font-bold">
          {student.name}
          {student.archived && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-medium text-gray-600">
              {t.archivedBadge}
            </span>
          )}
        </h1>
        <Link
          href={`/students/${student.id}/edit`}
          className="flex min-h-11 shrink-0 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium"
        >
          {t.edit}
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-xl border border-gray-200 p-4">
        <dt className="text-gray-500">{t.lessonMinutes}</dt>
        <dd>{format(t.minutesUnit, { n: student.lesson_minutes })}</dd>
        <dt className="text-gray-500">{t.createdAt}</dt>
        <dd>
          {formatDate(student.created_at, locale, timeZone)}
        </dd>
        <dt className="text-gray-500">{t.memo}</dt>
        <dd className="whitespace-pre-wrap break-words">{student.memo || "—"}</dd>
      </dl>

      <CreditSection
        t={all.credits}
        studentId={student.id}
        archived={student.archived}
        credits={credits}
        locale={locale}
        timeZone={timeZone}
      />

      <div className="mt-8 flex justify-end">
        <ArchiveButton
          studentId={student.id}
          archived={student.archived}
          label={student.archived ? t.unarchive : t.archive}
          confirmMessage={student.archived ? undefined : t.archiveConfirm}
        />
      </div>
    </main>
  );
}
