"use client";

import { usePanel } from "@/components/calendar/panel-context";
import { DEFAULT_LESSON_TIME } from "@/config/schedule";

// "+ 수업 추가" 버튼: 페이지를 옮기지 않고 옆 칸(폰은 아래 창)에 새 수업 폼을 띄움
export default function AddLessonButton({ date, label, className }: { date: string; label: string; className: string }) {
  const panel = usePanel();
  return (
    <button type="button" onClick={() => panel.openNew({ date, time: DEFAULT_LESSON_TIME })} className={className}>
      + {label}
    </button>
  );
}

// 폰: "이번 달 현황" 버튼 → 아래 창에 현황·학생 검색 (넓은 PC 는 옆 칸에 늘 보여서 필요 없음)
export function OverviewButton({ label, className }: { label: string; className: string }) {
  const panel = usePanel();
  return (
    <button type="button" onClick={() => panel.open({ mode: "overview" })} className={className}>
      {label}
    </button>
  );
}
