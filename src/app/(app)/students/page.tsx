import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { listStudents } from "@/lib/students";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getCreditOverview, type CurrentPlan } from "@/lib/credits";
import { planLabel } from "@/components/PlanSelect";
import { spanDay } from "@/lib/plan-timelines";
import { listNotesByStudent } from "@/lib/student-notes";
import { translateMany } from "@/lib/translate";
import { todayIn } from "@/lib/credit-math";
import { EmptyStudentsArt } from "@/components/Illustrations";
import StudentList from "@/components/StudentList";
import { createClient } from "@/lib/supabase/server";
import { AUTO_ARCHIVE_DAYS } from "@/config/rules";
import { getSettings } from "@/lib/settings";

// 남은 횟수 0회인 채로 오래된 학생 자동 보관 (SQL 0011 실행 전이면 아무 일도 안 함)
async function autoArchive() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auto_archive_students", { p_days: AUTO_ARCHIVE_DAYS });
  return typeof data === "number" ? data : 0;
}

export default async function StudentsPage({
  searchParams,
}: PageProps<"/students">) {
  const showArchived = (await searchParams).show === "archived";
  const archivedNow = showArchived ? 0 : await autoArchive(); // 목록을 읽기 전에 먼저 정리
  const [{ locale, t: all }, profile, students, notes, settings] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    listStudents(showArchived),
    listNotesByStudent(),
    getSettings(),
  ]);
  const t = all.students;
  const overview = await getCreditOverview(
    students.map((s) => s.id),
    todayIn(profile?.timezone ?? "UTC"),
  );
  // 노트 번역 (화면 언어와 다른 글만, 한 번에)
  const noteOf = (id: string) => notes.get(id) ?? { privateNote: "", sharedNote: "" };
  const translated = await translateMany(
    students.flatMap((st) => [noteOf(st.id).privateNote, noteOf(st.id).sharedNote]),
    locale,
  );
  const timeZone = profile?.timezone ?? "UTC";
  // 플랜 칸 글자: "주 2회 · 8회" / 결제일 "10/25" / 시작일 "10/27" / 종료일 "11/20 (예상)"
  const planText = (p: CurrentPlan | null) =>
    p && {
      label: planLabel(p.credits, all.credits),
      paid: `${Number(p.paidOn.slice(5, 7))}/${Number(p.paidOn.slice(8))}`,
      start: spanDay(p.span?.start, p.span?.startProjected, timeZone, t),
      end: spanDay(p.span?.end, p.span?.endProjected, timeZone, t),
    };
  const creditsOf = (id: string) => {
    const o = overview.get(id);
    return { remaining: o?.remaining ?? 0, expired: o?.expired ?? false, plan: planText(o?.plan ?? null) };
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:max-w-[88rem]">
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

      {archivedNow > 0 && (
        <p role="status" className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
          📦 {format(t.autoArchived, { n: archivedNow, days: AUTO_ARCHIVE_DAYS })}
        </p>
      )}

      {students.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <EmptyStudentsArt className="h-28" />
          <p className="mt-3 text-gray-500">{showArchived ? t.emptyArchived : t.empty}</p>
        </div>
      ) : (
        <StudentList
          students={students.map((st, i) => ({
            ...st,
            ...creditsOf(st.id),
            ...noteOf(st.id),
            privateNoteT: translated[i * 2],
            sharedNoteT: translated[i * 2 + 1],
          }))}
          archivedView={showArchived}
          autoArchiveDays={AUTO_ARCHIVE_DAYS}
          t={{ ...t, timesUnit: all.credits.timesUnit, expired: all.credits.expired }}
          panel={{
            t: { students: t, credits: all.credits, notes: all.notes, studentNotes: all.studentNotes },
            locale,
            timeZone,
            hoursBefore: settings.freeCancelHoursBefore,
          }}
        />
      )}
    </main>
  );
}
