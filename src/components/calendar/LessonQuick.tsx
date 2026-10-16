"use client";

import { useLessonDrag, type MoveConfig } from "@/components/calendar/useLessonDrag";
import { usePanel } from "@/components/calendar/panel-context";

type Props = {
  lessonId: string;
  studentId: string;
  scheduled: boolean; // 예정 수업만 끌어서 옮기기 가능
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  children: React.ReactNode; // 달력에 보이는 수업 칸 내용
  move?: MoveConfig; // 있으면 PC 시간표에서 끌어서 옮기기 가능 (예정 수업만)
};

// 달력의 수업 칸. 누르면 옆 칸(폰은 아래 창)에 그 수업의 완료·결석·수정 + 그 학생의 한 달 수업이 뜸
// move 가 있으면 칸을 끌어서 다른 날·시각으로 옮길 수 있음 (끌기 직후에는 옆 칸을 바꾸지 않음)
export default function LessonQuick({ lessonId, studentId, scheduled, className, style, title, children, move }: Props) {
  const panel = usePanel();
  const drag = useLessonDrag(lessonId, scheduled ? move : undefined);
  const { view } = panel;

  // 옆 칸에서 보고 있는 수업은 진하게, 같은 학생의 다른 수업은 옅게 테두리
  const selected = view.mode === "lesson" && view.lessonId === lessonId;
  const sameStudent = !selected && (view.mode === "lesson" || view.mode === "student") && view.studentId === studentId;
  // 옆 칸에서 학생을 고르면 달력에는 그 학생 수업만
  if (view.mode === "student" && view.studentId !== studentId) return null;

  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      onClick={() => {
        if (drag.consumeClick()) return;
        panel.open({ mode: "lesson", lessonId, studentId });
      }}
      {...drag.handlers}
      className={`text-left ${move && scheduled ? "cursor-grab active:cursor-grabbing" : ""} ${selected ? "ring-2 ring-brand-600" : sameStudent ? "ring-2 ring-brand-300" : ""} ${drag.dragStyle ? "opacity-80 ring-2 ring-brand-500" : ""} ${drag.pending ? "animate-pulse" : ""} ${className ?? ""}`}
      style={{ ...style, ...drag.dragStyle }}
    >
      {children}
      {drag.dragLabel && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-600/90 px-1 text-[11px] font-semibold whitespace-nowrap text-white">
          {drag.dragLabel}
        </span>
      )}
    </button>
  );
}
