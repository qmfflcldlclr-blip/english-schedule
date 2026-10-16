"use client";

import { useTransition } from "react";
import { format } from "@/i18n/format";
import { completeLessons } from "@/lib/lesson-status-actions";
import { usePanel } from "@/components/calendar/panel-context";

type Props = {
  ids: string[]; // 그날 "예정" 수업
  dayLabel: string; // "10월 12일 (월)"
  labels: { button: string; confirm: string; done: string; failed: string }; // confirm: "{day}" "{n}"
  className?: string;
};

// 요일 옆 ☑ : 그날 예정 수업을 한 번에 완료(출석) 처리
export default function DayAttendButton({ ids, dayLabel, labels, className }: Props) {
  const panel = usePanel();
  const [pending, startTransition] = useTransition();
  if (ids.length === 0) return null;

  const run = () => {
    if (!window.confirm(format(labels.confirm, { day: dayLabel, n: ids.length }))) return;
    startTransition(async () => {
      const r = await completeLessons(ids);
      window.alert(format(r.failed ? labels.failed : labels.done, { n: r.done, failed: r.failed }));
      panel.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      title={format(labels.confirm, { day: dayLabel, n: ids.length })}
      aria-label={labels.button}
      className={`rounded-md border border-brand-300 bg-white px-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:animate-pulse disabled:opacity-60 ${className ?? ""}`}
    >
      ☑ {labels.button}
    </button>
  );
}
