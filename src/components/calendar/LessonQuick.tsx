"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickLessonStatus } from "@/lib/lesson-status-actions";
import { format } from "@/i18n/format";

export type QuickLabels = {
  complete: string;
  absent: string;
  details: string;
  close: string;
  processing: string;
  confirmComplete: string;
  confirmCompleteNoCredits: string; // "{n}"
  confirmAbsent: string;
  errors: Record<string, string>; // statusErrors
};

type Props = {
  lessonId: string;
  scheduled: boolean; // 예정 수업만 완료·결석 가능
  heading: string; // "16:00 · 김민준"
  sub: string; // "15분 · 예정"
  labels: QuickLabels;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  children: React.ReactNode; // 달력에 보이는 수업 칸 내용
};

// 수업 칸을 누르면 작은 창: [✓ 완료] [✕ 결석] [자세히]. 처리 후 달력만 새로 그림
export default function LessonQuick({ lessonId, scheduled, heading, sub, labels, className, style, title, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: "complete" | "absent") => {
    if (!window.confirm(action === "complete" ? labels.confirmComplete : labels.confirmAbsent)) return;
    setError(null);
    startTransition(async () => {
      let result = await quickLessonStatus(lessonId, action);
      if ("confirmRemaining" in result) {
        if (!window.confirm(format(labels.confirmCompleteNoCredits, { n: result.confirmRemaining }))) return;
        result = await quickLessonStatus(lessonId, action, true);
      }
      if ("error" in result) {
        setError(labels.errors[result.error] ?? labels.errors.unknown);
        return;
      }
      dialog.current?.close();
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        title={title}
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
        className={`text-left ${className ?? ""}`}
        style={style}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()} // 바깥(어두운 곳) 누르면 닫기
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <p className="text-lg font-bold">{heading}</p>
          <p className="mt-0.5 text-sm text-gray-500">{sub}</p>

          {scheduled && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run("complete")}
                className="min-h-14 rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-60"
              >
                ✓ {labels.complete}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run("absent")}
                className="min-h-14 rounded-xl border border-red-200 bg-red-50 font-semibold text-red-700 disabled:opacity-60"
              >
                ✕ {labels.absent}
              </button>
            </div>
          )}
          {pending && <p className="mt-2 text-center text-sm text-gray-500">{labels.processing}</p>}
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-12 flex-1 rounded-xl border border-gray-300 bg-white font-medium"
            >
              {labels.close}
            </button>
            <Link
              href={`/calendar/lessons/${lessonId}`}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white font-medium"
            >
              {labels.details} ›
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
