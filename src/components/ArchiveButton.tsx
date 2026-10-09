"use client";

import { useTransition } from "react";
import { setStudentArchived } from "@/lib/student-actions";

type Props = {
  studentId: string;
  archived: boolean;
  label: string;
  confirmMessage?: string;
};

// 보관하기(확인 창 띄움) / 보관 해제 버튼
export default function ArchiveButton({
  studentId,
  archived,
  label,
  confirmMessage,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        startTransition(() => setStudentArchived(studentId, !archived));
      }}
      className="min-h-11 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
