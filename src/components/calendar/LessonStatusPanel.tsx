"use client";

import { useState, useTransition } from "react";
import { changeLessonStatus, type StatusAction } from "@/lib/lesson-status-actions";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { LessonStatus } from "@/lib/lessons";

type Props = {
  t: Messages["calendar"];
  lessonId: string;
  status: LessonStatus;
  remaining: number;
  units: number; // 이 수업이 몇 회인지 (30분 = 1회)
};

export default function LessonStatusPanel({ t, lessonId, status, remaining, units }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: StatusAction, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await changeLessonStatus(lessonId, action);
      if (result?.error) setError(result.error);
    });
  };

  const errorText = error && (t.statusErrors[error as keyof typeof t.statusErrors] ?? t.statusErrors.unknown);
  const big = "min-h-14 rounded-xl font-semibold disabled:opacity-60";

  // ── 이미 처리된 수업: 되돌리기만 ──
  if (status !== "scheduled") {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("revert", t.confirmRevert)}
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white font-medium disabled:opacity-60"
        >
          {pending ? t.processing : `↩ ${t.actions.revert}`}
        </button>
        {errorText && <p className="mt-2 text-sm text-red-600">{errorText}</p>}
      </div>
    );
  }

  // ── 예정 수업: 완료 / 결석(차감) / 연기(차감 없음) ──
  return (
    <div className="mt-6">
      <p className={`mb-2 text-sm ${remaining <= 0 ? "font-semibold text-red-600" : "text-gray-500"}`}>
        {format(t.remainingNow, { n: remaining })}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run("complete", remaining < units ? format(t.confirmCompleteNoCredits, { n: remaining }) : format(t.confirmComplete, { units }))
          }
          className={`${big} bg-brand-600 text-white`}
        >
          {t.actions.complete}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("absent", format(t.confirmAbsent, { units }))}
          className={`${big} border border-red-200 text-red-700`}
        >
          {t.actions.absent}
        </button>
        <button type="button" disabled={pending} onClick={() => run("cancel", t.confirmPostpone)} className={`${big} border border-gray-300 bg-white`}>
          {t.actions.cancel}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">{t.postponeHint}</p>
      {pending && <p className="mt-2 text-sm text-gray-500">{t.processing}</p>}
      {errorText && <p className="mt-2 text-sm text-red-600">{errorText}</p>}
    </div>
  );
}
