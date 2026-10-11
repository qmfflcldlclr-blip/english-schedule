// 피드백 목록 (피드백 메뉴·학생 상세 공용). 내가 쓴 것만 고치기·지우기
// 수업 피드백이면 "10/12 (월) 18:00 수업" → 누르면 달력에서 그 수업을 엶. 화면 언어와 다르면 번역해서 보여 줌
import Link from "next/link";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { Feedback } from "@/lib/feedback";
import { formatDay, toScheduleDay, toZoned } from "@/lib/time";
import { feedbackCopyText, kindIcon, kindStyle } from "@/components/feedback/kinds";
import DeleteFeedbackButton from "@/components/feedback/DeleteFeedbackButton";
import CopyFeedbackButton from "@/components/feedback/CopyFeedbackButton";

type Props = {
  items: Feedback[];
  t: Messages["feedback"];
  me: string; // 로그인한 사람 id
  timeZone: string;
  locale: string;
  back: string; // 고치기·지우기 후 돌아올 곳
  showStudent?: boolean; // 피드백 메뉴에서는 학생 이름도 표시
  translations?: (string | null)[]; // items 와 같은 순서의 번역 (필요 없으면 null)
};

export default function FeedbackList({ items, t, me, timeZone, locale, back, showStudent, translations = [] }: Props) {
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${z.date.replaceAll("-", ".")} ${z.time}`;
  };
  // "10/12 (월) 18:00 수업" (새벽 수업은 전날 기준)
  const lessonLabel = (iso: string) => {
    const day = toScheduleDay(iso, timeZone).date;
    return format(t.lessonOf, {
      date: `${formatDay(day, locale, { month: "numeric", day: "numeric", weekday: "short" })} ${toZoned(iso, timeZone).time}`,
    });
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((f, i) => {
        const translated = translations[i];
        const lesson = f.lessonStartsAt ? lessonLabel(f.lessonStartsAt) : null;
        return (
          <li key={f.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kindStyle[f.kind]}`}>
                {kindIcon[f.kind]} {t.kinds[f.kind]}
              </span>
              {showStudent && (
                <Link href={`/students/${f.studentId}`} className="font-semibold hover:underline">
                  {f.studentName}
                </Link>
              )}
              {lesson && f.lessonId && f.lessonStartsAt ? (
                <Link
                  href={`/calendar?date=${toScheduleDay(f.lessonStartsAt, timeZone).date}&lesson=${f.lessonId}`}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                >
                  📅 {lesson} ›
                </Link>
              ) : (
                <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-400">{t.general}</span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-gray-800">{translated || f.content}</p>
            {translated && (
              <details className="mt-1 text-sm text-gray-500">
                <summary className="cursor-pointer">🌐 {t.original}</summary>
                <p className="mt-1 whitespace-pre-wrap">{f.content}</p>
              </details>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {f.authorName} · {stamp(f.createdAt)}
                {f.edited && ` · ${t.edited}`}
              </span>
              <span className="-my-2 flex shrink-0 items-center">
                <CopyFeedbackButton
                  labels={{ copy: t.copy, copied: t.copied }}
                  text={feedbackCopyText({
                    studentName: f.studentName,
                    lessonLabel: lesson,
                    icon: kindIcon[f.kind],
                    kind: t.kinds[f.kind],
                    text: translated || f.content,
                  })}
                />
                {f.createdBy === me && (
                  <>
                    <Link
                      href={`/feedback/${f.id}/edit?back=${encodeURIComponent(back)}`}
                      className="flex min-h-11 items-center rounded-full px-3 font-medium text-brand-700 hover:bg-brand-50"
                    >
                      {t.edit}
                    </Link>
                    <DeleteFeedbackButton id={f.id} back={back} label={t.delete} confirmMessage={t.deleteConfirm} />
                  </>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
