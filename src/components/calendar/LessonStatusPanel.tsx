"use client";

import { useEffect, useState, useTransition } from "react";
import {
  changeLessonStatus,
  previewCancel,
  type CancelPreview,
  type StatusAction,
} from "@/lib/lesson-status-actions";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { LessonStatus } from "@/lib/lessons";
import { fieldClass } from "@/components/PlanForm";

type Props = {
  t: Messages["calendar"];
  lessonId: string;
  status: LessonStatus;
  remaining: number;
  units: number; // 이 수업이 몇 회인지 (30분 = 1회)
  hoursBefore: number; // 무료 취소 기준 (설정 값)
  now: { date: string; time: string }; // 내 시간대의 지금 (취소 시각 기본값)
};

export default function LessonStatusPanel({ t, lessonId, status, remaining, units, hoursBefore, now }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelDate, setCancelDate] = useState(now.date);
  const [cancelTime, setCancelTime] = useState(now.time);
  const [preview, setPreview] = useState<CancelPreview | null>(null);

  // 취소 창이 열려 있으면 취소 시각이 바뀔 때마다 무료/차감 미리보기를 다시 확인
  useEffect(() => {
    if (!cancelOpen) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await previewCancel(lessonId, cancelDate, cancelTime);
      if (!stale) setPreview(result);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
      setPreview(null);
    };
  }, [cancelOpen, cancelDate, cancelTime, lessonId]);

  const run = (action: StatusAction, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await changeLessonStatus(lessonId, action, cancelDate, cancelTime);
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

  // ── 취소 창 ──
  if (cancelOpen) {
    const p = preview && !("error" in preview) ? preview : null;
    return (
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <h2 className="font-semibold">{t.cancelTitle}</h2>
        <p className="mt-3 text-sm font-medium">{t.cancelledAt}</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} className={fieldClass} />
          <input type="time" value={cancelTime} onChange={(e) => setCancelTime(e.target.value)} className={fieldClass} />
        </div>
        <p className="mt-1 text-sm text-gray-500">{t.cancelledAtHint}</p>

        <div
          aria-live="polite"
          className={`mt-4 rounded-xl p-3 text-sm ${
            !p ? "bg-gray-50 text-gray-500" : p.free ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
          }`}
        >
          {!p ? (
            t.checking
          ) : (
            <>
              <p className="font-semibold">{p.free ? `✅ ${t.cancelPreviewFree}` : `⚠️ ${format(t.cancelPreviewCharged, { units })}`}</p>
              <p className="mt-0.5">{format(t.reasons[p.reason], { hours: hoursBefore, n: p.cancels })}</p>
            </>
          )}
        </div>

        {errorText && <p className="mt-2 text-sm text-red-600">{errorText}</p>}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => setCancelOpen(false)} className="min-h-12 flex-1 rounded-xl border border-gray-300 bg-white font-medium">
            {t.back}
          </button>
          <button
            type="button"
            disabled={pending || !p}
            onClick={() => run("cancel")}
            className="min-h-12 flex-1 rounded-xl bg-brand-600 font-medium text-white disabled:opacity-60"
          >
            {pending ? t.processing : t.confirmCancel}
          </button>
        </div>
      </section>
    );
  }

  // ── 예정 수업: 완료 / 취소 / 결석 ──
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
        <button type="button" disabled={pending} onClick={() => setCancelOpen(true)} className={`${big} border border-gray-300 bg-white`}>
          {t.actions.cancel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("absent", format(t.confirmAbsent, { units }))}
          className={`${big} border border-red-200 text-red-700`}
        >
          {t.actions.absent}
        </button>
      </div>
      {pending && <p className="mt-2 text-sm text-gray-500">{t.processing}</p>}
      {errorText && <p className="mt-2 text-sm text-red-600">{errorText}</p>}
    </div>
  );
}
