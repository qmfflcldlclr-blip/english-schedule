import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { format, formatDate } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getStudent } from "@/lib/students";
import { getStudentCredits } from "@/lib/credits";
import { getSettings } from "@/lib/settings";
import { todayIn } from "@/lib/credit-math";
import ArchiveButton from "@/components/ArchiveButton";
import CreditSection from "@/components/CreditSection";
import FeedbackList from "@/components/feedback/FeedbackList";
import { listFeedback } from "@/lib/feedback";

// 학생 상세에서 보여 줄 최근 피드백 개수
const RECENT_FEEDBACK = 3;

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
  const [credits, settings, feedback] = await Promise.all([
    getStudentCredits(student.id, todayIn(timeZone)),
    getSettings(),
    listFeedback({ studentId: student.id }),
  ]);
  const fb = all.feedback;
  const here = `/students/${student.id}`;

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
          {student.label}
          {student.archived && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-medium text-gray-600">
              {t.archivedBadge}
            </span>
          )}
        </h1>
        <Link
          href={`/students/${student.id}/edit`}
          className="flex min-h-11 shrink-0 items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium"
        >
          {t.edit}
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <dt className="text-gray-500">{t.lessonMinutes}</dt>
        <dd>{format(t.minutesUnit, { n: student.lesson_minutes })}</dd>
        <dt className="text-gray-500">{t.createdAt}</dt>
        <dd>
          {formatDate(student.created_at, locale, timeZone)}
        </dd>
        <dt className="text-gray-500">{t.memo}</dt>
        <dd className="whitespace-pre-wrap break-words">{student.memo || "—"}</dd>
      </dl>

      {/* 피드백 (최근 몇 개 + 모두 보기) */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{fb.sectionTitle}</h2>
          {!student.archived && (
            <Link
              href={`/feedback/new?student=${student.id}&back=${encodeURIComponent(here)}`}
              className="flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
            >
              + {fb.add}
            </Link>
          )}
        </div>
        {feedback.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{fb.empty}</p>
        ) : (
          <div className="mt-3">
            <FeedbackList items={feedback.slice(0, RECENT_FEEDBACK)} t={fb} me={profile?.id ?? ""} timeZone={timeZone} back={here} />
            {feedback.length > RECENT_FEEDBACK && (
              <Link href={`/feedback?student=${student.id}`} className="mt-2 flex min-h-11 items-center justify-center text-sm font-medium text-brand-700">
                {format(fb.seeAll, { n: feedback.length })} ›
              </Link>
            )}
          </div>
        )}
      </section>

      <CreditSection
        t={all.credits}
        studentId={student.id}
        archived={student.archived}
        credits={credits}
        locale={locale}
        timeZone={timeZone}
        hoursBefore={settings.freeCancelHoursBefore}
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
