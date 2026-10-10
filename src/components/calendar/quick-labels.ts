// 달력 빠른 처리 창의 문구 모음 + 수업 상태 글자 (달력 PC·폰 공용)
import type { Messages } from "@/i18n/server";
import type { Lesson } from "@/lib/lessons";
import type { QuickLabels } from "@/components/calendar/LessonQuick";

export function quickLabels(t: Messages["calendar"]): QuickLabels {
  return {
    complete: t.actions.complete,
    absent: t.actions.absent,
    details: t.details,
    close: t.close,
    processing: t.processing,
    confirmComplete: t.confirmComplete,
    confirmCompleteNoCredits: t.confirmCompleteNoCredits,
    confirmAbsent: t.confirmAbsent,
    errors: t.statusErrors,
  };
}

// "예정" / "완료" / "무료 취소" / "차감 취소" / "결석 (노쇼)"
export function statusText(l: Pick<Lesson, "status" | "cancelled_at">, t: Messages["calendar"]) {
  if (l.status === "absent") return l.cancelled_at ? t.lateCancel : t.noShow;
  return t.status[l.status];
}
