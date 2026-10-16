import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students";
import { isFeedbackKind, listFeedback } from "@/lib/feedback";
import FeedbackList from "@/components/feedback/FeedbackList";
import FeedbackFilters from "@/components/feedback/FeedbackFilters";
import { EmptyStudentsArt } from "@/components/Illustrations";
import { translateMany } from "@/lib/translate";
import ExportFeedback from "@/components/feedback/ExportFeedback";
import { kindIcon } from "@/components/feedback/kinds";
import { format } from "@/i18n/format";
import { formatDay, toScheduleDay, toZoned } from "@/lib/time";

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
  // 학생을 고르면 그 학생 피드백을 모두 (내보내기용)
  const items = await listFeedback({ studentId: studentId || undefined, kind: kind || undefined, limit: studentId ? 2000 : undefined });
  const translations = await translateMany(items.map((f) => f.content), locale); // 화면 언어와 다른 피드백만
  const back = `/feedback${studentId || kind ? `?${new URLSearchParams({ ...(studentId && { student: studentId }), ...(kind && { kind }) })}` : ""}`;

  // 학생별 내보내기: 수업 날짜순으로 묶어서 "■ 10/12 (월) 18:00 수업" 아래에 그 수업 피드백
  const timeZone = profile?.timezone ?? "UTC";
  const student = students.find((s) => s.id === studentId);
  let exportText = "";
  if (student && items.length) {
    const when = (iso: string) => {
      const day = toScheduleDay(iso, timeZone).date;
      return `${formatDay(day, locale, { year: "numeric", month: "numeric", day: "numeric", weekday: "short" })} ${toZoned(iso, timeZone).time}`;
    };
    const groups = new Map<string, { at: string; head: string; lines: string[] }>();
    items.forEach((f, i) => {
      const key = f.lessonId ?? `general|${f.createdAt.slice(0, 10)}`;
      const at = f.lessonStartsAt ?? f.createdAt;
      const head = f.lessonStartsAt
        ? format(t.lessonOf, { date: when(f.lessonStartsAt) })
        : `${t.general} (${format(t.exportWritten, { date: when(f.createdAt) })})`;
      const g = groups.get(key) ?? { at, head, lines: [] };
      g.lines.unshift(`${kindIcon[f.kind]} ${t.kinds[f.kind]}: ${translations[i] || f.content} — ${f.authorName}`); // 목록이 최신순 → 앞에 넣어 오래된 순
      groups.set(key, g);
    });
    exportText = [
      format(t.exportHeading, { name: student.label, n: items.length }),
      ...[...groups.values()].sort((a, b) => a.at.localeCompare(b.at)).map((g) => `■ ${g.head}\n${g.lines.join("\n")}`),
    ].join("\n\n");
  }

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

      {exportText && (
        <div className="mt-3">
          <ExportFeedback
            text={exportText}
            fileName={`${student!.label}_${t.exportFile}_${toZoned(new Date(), timeZone).date}.txt`}
            labels={{ title: format(t.exportTitle, { name: student!.label }), copy: t.exportCopy, copied: t.copied, download: t.exportDownload }}
          />
        </div>
      )}

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
            timeZone={timeZone}
            locale={locale}
            back={back}
            showStudent
          />
        )}
      </div>
    </main>
  );
}
