"use client";

import { usePanel } from "@/components/calendar/panel-context";

// "+ 수업 추가" 버튼: 페이지를 옮기지 않고 옆 칸(폰은 아래 창)에 새 수업 폼을 띄움
export default function AddLessonButton({ date, label, className }: { date: string; label: string; className: string }) {
  const panel = usePanel();
  return (
    <button type="button" onClick={() => panel.openNew({ date, time: "16:00" })} className={className}>
      + {label}
    </button>
  );
}
