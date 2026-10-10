"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import StudentCombobox from "@/components/StudentCombobox";
import { kindIcon } from "@/components/feedback/kinds";

type Kind = keyof typeof kindIcon;

// 피드백 메뉴 위쪽: 학생 고르기 + 종류 버튼 (주소 ?student=&kind= 로 거름)
export default function FeedbackFilters({
  students,
  studentId,
  kind,
  labels,
}: {
  students: { id: string; name: string }[];
  studentId: string;
  kind: Kind | "";
  labels: { all: string; allStudents: string; placeholder: string; noMatch: string; kinds: Record<Kind, string> };
}) {
  const router = useRouter();
  const href = (s: string, k: string) => {
    const q = new URLSearchParams();
    if (s) q.set("student", s);
    if (k) q.set("kind", k);
    return `/feedback${q.size ? `?${q}` : ""}`;
  };
  const chip = "flex min-h-10 items-center rounded-full border px-3 text-sm font-medium";

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="flex items-center gap-2 md:w-72">
        <div className="flex-1 [&_input]:mt-0">
          {/* key: 학생 선택을 지우면 입력칸도 새로 그림 */}
          <StudentCombobox
            key={studentId}
            name="student"
            students={students}
            value={studentId}
            onChange={(id) => router.replace(href(id, kind))}
            placeholder={labels.placeholder}
            noMatch={labels.noMatch}
          />
        </div>
        {studentId && (
          <Link href={href("", kind)} className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm text-gray-600 hover:bg-gray-100">
            ✕ {labels.allStudents}
          </Link>
        )}
      </div>
      <nav className="flex flex-wrap gap-2">
        <Link href={href(studentId, "")} className={`${chip} ${kind === "" ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white"}`}>
          {labels.all}
        </Link>
        {(Object.keys(kindIcon) as Kind[]).map((k) => (
          <Link
            key={k}
            href={href(studentId, k)}
            className={`${chip} ${kind === k ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white"}`}
          >
            {kindIcon[k]} {labels.kinds[k]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
