// 피드백 목록 (피드백 메뉴·학생 상세 공용). 내가 쓴 것만 고치기·지우기
import Link from "next/link";
import type { Messages } from "@/i18n/server";
import type { Feedback } from "@/lib/feedback";
import { toZoned } from "@/lib/time";
import { kindIcon, kindStyle } from "@/components/feedback/kinds";
import DeleteFeedbackButton from "@/components/feedback/DeleteFeedbackButton";

type Props = {
  items: Feedback[];
  t: Messages["feedback"];
  me: string; // 로그인한 사람 id
  timeZone: string;
  back: string; // 고치기·지우기 후 돌아올 곳
  showStudent?: boolean; // 피드백 메뉴에서는 학생 이름도 표시
};

export default function FeedbackList({ items, t, me, timeZone, back, showStudent }: Props) {
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${z.date.replaceAll("-", ".")} ${z.time}`;
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((f) => (
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
          </div>
          <p className="mt-2 whitespace-pre-wrap text-gray-800">{f.content}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {f.authorName} · {stamp(f.createdAt)}
              {f.edited && ` · ${t.edited}`}
            </span>
            {f.createdBy === me && (
              <span className="-my-2 flex shrink-0 items-center">
                <Link
                  href={`/feedback/${f.id}/edit?back=${encodeURIComponent(back)}`}
                  className="flex min-h-11 items-center rounded-full px-3 font-medium text-brand-700 hover:bg-brand-50"
                >
                  {t.edit}
                </Link>
                <DeleteFeedbackButton id={f.id} back={back} label={t.delete} confirmMessage={t.deleteConfirm} />
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
