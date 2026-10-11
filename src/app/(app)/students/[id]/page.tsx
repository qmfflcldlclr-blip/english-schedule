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
import { getStudentNotes } from "@/lib/student-notes";
import { translateMany, translateNote } from "@/lib/translate";
import { toZoned } from "@/lib/time";
import NoteCard from "@/components/NoteCard";

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
  const [credits, settings, feedback, notes] = await Promise.all([
    getStudentCredits(student.id, todayIn(timeZone)),
    getSettings(),
    listFeedback({ studentId: student.id }),
    getStudentNotes(student.id),
  ]);
  // 공유용 노트는 상대방 글일 수 있어서 자동 번역 (개별용은 내가 쓴 글이라 번역 안 함)
  const sharedTranslation = notes ? await translateNote(notes.shared.content, locale) : null;
  const sn = all.studentNotes;
  const recentFeedback = feedback.slice(0, RECENT_FEEDBACK);
  const feedbackTranslations = await translateMany(recentFeedback.map((f) => f.content), locale);
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${Number(z.date.slice(5, 7))}/${Number(z.date.slice(8))} ${z.time}`;
  };
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
          {/* 영어 화면: 한글 이름도 작게 */}
          {!student.label.startsWith(student.name) && <span className="ml-2 text-base font-normal text-gray-400">{student.name}</span>}
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
      </dl>

      {/* 학생 노트: 개별용(나만) · 공유용(함께) */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">{sn.title}</h2>
        {notes ? (
          <div className="grid gap-3 md:grid-cols-2">
            <NoteCard
              title={sn.private}
              icon="🔒"
              content={notes.private.content}
              updatedLabel={notes.private.updatedAt ? format(all.notes.updated, { time: stamp(notes.private.updatedAt) }) : null}
              editable
              accent="sunny"
              locale={locale}
              studentNote={{ studentId: student.id, visibility: "private" }}
              t={{ ...all.notes, placeholder: sn.privatePlaceholder, errors: { ...all.notes.errors, setup: sn.setup } }}
            />
            <NoteCard
              title={sn.shared}
              icon="👥"
              content={notes.shared.content}
              updatedLabel={
                notes.shared.updatedAt
                  ? format(sn.updatedBy, { time: stamp(notes.shared.updatedAt), name: notes.shared.updatedByName ?? "" })
                  : null
              }
              editable
              accent="brand"
              locale={locale}
              translation={sharedTranslation}
              studentNote={{ studentId: student.id, visibility: "shared" }}
              t={{ ...all.notes, placeholder: sn.sharedPlaceholder, errors: { ...all.notes.errors, setup: sn.setup } }}
            />
          </div>
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{sn.setup}</p>
        )}
      </section>

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
            <FeedbackList
              items={recentFeedback}
              translations={feedbackTranslations}
              t={fb}
              me={profile?.id ?? ""}
              timeZone={timeZone}
              locale={locale}
              back={here}
            />
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
