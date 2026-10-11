import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students";
import { isFeedbackKind, listFeedback } from "@/lib/feedback";
import FeedbackList from "@/components/feedback/FeedbackList";
import FeedbackFilters from "@/components/feedback/FeedbackFilters";
import { EmptyStudentsArt } from "@/components/Illustrations";
import { translateMany } from "@/lib/translate";

// 피드백 메뉴: 전체 피드백 최신순, 학생·종류로 거르기
export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const [{ locale, t: all }, profile, sp, students] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
    listStudents(false),
  ]);
  const t = all.feedback;
  const studentId = students.some((s) => s.id === sp.student) ? (sp.student as string) : "";
  const kind = isFeedbackKind(sp.kind) ? sp.kind : "";
  const items = await listFeedback({ studentId: studentId || undefined, kind: kind || undefined });
  const translations = await translateMany(items.map((f) => f.content), locale); // 화면 언어와 다른 피드백만
  const back = `/feedback${studentId || kind ? `?${new URLSearchParams({ ...(studentId && { student: studentId }), ...(kind && { kind }) })}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link
          href={`/feedback/new${studentId ? `?student=${studentId}` : ""}`}
          className="flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
        >
          + {t.add}
        </Link>
      </div>

      <div className="mt-4">
        <FeedbackFilters
          students={students.map((s) => ({ id: s.id, name: s.label }))}
          studentId={studentId}
          kind={kind}
          labels={{ all: t.all, allStudents: t.allStudents, placeholder: all.calendar.searchStudent, noMatch: all.calendar.noMatch, kinds: t.kinds }}
        />
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <EmptyStudentsArt className="h-28" />
            <p className="mt-3 font-medium text-gray-700">{t.empty}</p>
            <p className="mt-1 text-sm text-gray-500">{t.emptyHint}</p>
          </div>
        ) : (
          <FeedbackList
            items={items}
            translations={translations}
            t={t}
            me={profile?.id ?? ""}
            timeZone={profile?.timezone ?? "UTC"}
            locale={locale}
            back={back}
            showStudent
          />
        )}
      </div>
    </main>
  );
}
