"use client";

// 학생 목록 옆 칸 (넓은 PC: 오른쪽 고정 / 폰·좁은 화면: 아래에서 올라오는 창)
// 남은 횟수 → 플랜 추가(간단) → 횟수 조정 → 노트(개별용·공유용) → 횟수 기록(최근 10개 + 더 보기)
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDate } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { useActionForm } from "@/lib/use-action-form";
import { adjustCredits, savePlan, type AdjustFormState, type PlanFormState } from "@/lib/credit-actions";
import { loadStudentPanel, type StudentPanelData } from "@/lib/student-panel-actions";
import { ADJUST_MAX, LOW_CREDIT_THRESHOLD, PLAN_CREDITS_MAX } from "@/config/rules";
import { toZoned } from "@/lib/time";
import NoteCard from "@/components/NoteCard";

const HISTORY_STEP = 10;

export type PanelT = {
  students: Messages["students"];
  credits: Messages["credits"];
  notes: Messages["notes"];
  studentNotes: Messages["studentNotes"];
};

type Props = {
  studentId: string | null; // null = 닫힘
  version: number; // 저장 후 1씩 늘어남 → 다시 가져옴
  onClose: () => void;
  onChanged: () => void; // 저장 후: 목록 새로 + 옆 칸 다시 가져오기
  t: PanelT;
  locale: string;
  timeZone: string;
  hoursBefore: number; // 무료 취소 기준 시간 (기록 설명용)
};

const field =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none";
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

export default function StudentPanel({ studentId, version, onClose, onChanged, t, locale, timeZone, hoursBefore }: Props) {
  const [data, setData] = useState<{ key: string; value: StudentPanelData | null } | null>(null);
  const key = `${studentId}|${version}`;

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    loadStudentPanel(studentId).then((value) => alive && setData({ key, value }));
    return () => {
      alive = false;
    };
  }, [studentId, key]);

  const open = Boolean(studentId);
  // 다른 학생으로 바꾸는 중이면 이전 학생 내용은 숨김 (같은 학생 새로 고침 중에는 그대로 보여 줌)
  const current = data && data.value?.student.id === studentId ? data.value : null;
  const loading = !data || data.key !== key;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl lg:sticky lg:top-20 lg:mt-3 lg:inset-auto lg:z-auto lg:max-h-[calc(100dvh-6rem)] lg:rounded-2xl lg:border lg:border-gray-200 lg:pb-4 lg:shadow-sm ${open ? "" : "hidden lg:block"}`}
      >
        {!open ? (
          <p className="py-8 text-center text-sm text-gray-500">{t.students.panelHint}</p>
        ) : !current ? (
          <p className="py-8 text-center text-sm text-gray-400">{loading ? t.students.panelLoading : t.students.panelGone}</p>
        ) : (
          <PanelBody key={current.student.id} data={current} refreshing={loading} {...{ onClose, onChanged, t, locale, timeZone, hoursBefore }} />
        )}
      </aside>
    </>
  );
}

function PanelBody({
  data,
  refreshing,
  onClose,
  onChanged,
  t,
  locale,
  timeZone,
  hoursBefore,
}: Omit<Props, "studentId" | "version"> & { data: StudentPanelData; refreshing: boolean }) {
  const { student, credits, notes, today } = data;
  const tc = t.credits;
  const [historyCount, setHistoryCount] = useState(HISTORY_STEP);
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${Number(z.date.slice(5, 7))}/${Number(z.date.slice(8))} ${z.time}`;
  };
  const noteT = (placeholder: string) => ({
    ...t.notes,
    placeholder,
    errors: { ...t.notes.errors, setup: t.studentNotes.setup },
  });

  // 기록 한 줄 설명: 어느 수업인지 + 취소 사유 / 되돌린 것 / 조정 사유
  const describe = (e: StudentPanelData["credits"]["entries"][number]) => {
    const parts: string[] = [];
    if (e.lessonStartsAt) parts.push(format(tc.lessonOn, { date: formatDate(e.lessonStartsAt, locale, timeZone) }));
    if (e.kind === "revert" && e.detail) {
      const undone = e.detail === "completed" ? "lesson_completed" : e.detail;
      if (undone in tc.kinds) parts.push(format(tc.revertOf, { status: tc.kinds[undone as keyof typeof tc.kinds] }));
    } else if (e.detail && e.detail in tc.reasons) {
      parts.push(format(tc.reasons[e.detail as keyof typeof tc.reasons], { hours: hoursBefore }));
    }
    if (e.reason) parts.push(e.reason);
    return parts.join(" · ");
  };

  const tone =
    credits.remaining <= 0
      ? "bg-red-100 text-red-700"
      : credits.remaining <= LOW_CREDIT_THRESHOLD
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";

  return (
    <div className={refreshing ? "opacity-70 transition-opacity" : ""}>
      {/* 머리: 이름 · 남은 횟수 · 자세히 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{student.label}</h2>
          {!student.label.startsWith(student.name) && <p className="text-sm text-gray-400">{student.name}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href={`/students/${student.id}`} className="flex min-h-11 items-center px-1 text-sm text-gray-600 underline underline-offset-4">
            {t.students.details} ›
          </Link>
          <button type="button" onClick={onClose} aria-label={t.students.panelClose} className="flex size-11 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
        <span className={`rounded-full px-3 py-1 text-lg font-bold tabular-nums ${tone}`}>{format(tc.timesUnit, { n: credits.remaining })}</span>
        <span className="text-sm text-gray-600">
          {tc.remaining}
          <span className="block text-xs text-gray-500">
            {tc.purchased} {format(tc.timesUnit, { n: credits.purchased })} · {tc.used} {format(tc.timesUnit, { n: credits.used })}
          </span>
        </span>
      </div>

      <QuickPlan key={`plan-${data.credits.purchased}`} t={tc} studentId={student.id} today={today} onSaved={onChanged} />
      <QuickAdjust key={`adj-${data.credits.entries.length}`} t={tc} studentId={student.id} onSaved={onChanged} />

      {/* 노트 */}
      <h3 className="mt-5 text-sm font-semibold text-gray-700">{t.studentNotes.title}</h3>
      {notes ? (
        <div className="mt-2 flex flex-col gap-2">
          <NoteCard
            key={`p-${notes.private.updatedAt}`}
            title={t.studentNotes.private}
            icon="🔒"
            content={notes.private.content}
            updatedLabel={notes.private.updatedAt ? format(t.notes.updated, { time: stamp(notes.private.updatedAt) }) : null}
            editable
            accent="sunny"
            locale={locale}
            studentNote={{ studentId: student.id, visibility: "private" }}
            t={noteT(t.studentNotes.privatePlaceholder)}
          />
          <NoteCard
            key={`s-${notes.shared.updatedAt}`}
            title={t.studentNotes.shared}
            icon="👥"
            content={notes.shared.content}
            updatedLabel={
              notes.shared.updatedAt
                ? format(t.studentNotes.updatedBy, { time: stamp(notes.shared.updatedAt), name: notes.shared.updatedByName ?? "" })
                : null
            }
            editable
            accent="brand"
            locale={locale}
            translation={data.sharedTranslation}
            studentNote={{ studentId: student.id, visibility: "shared" }}
            t={noteT(t.studentNotes.sharedPlaceholder)}
          />
        </div>
      ) : (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t.studentNotes.setup}</p>
      )}

      {/* 횟수 기록 (최신순) */}
      <h3 className="mt-5 text-sm font-semibold text-gray-700">{tc.historyTitle}</h3>
      {credits.entries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{tc.noHistory}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {credits.entries.slice(0, historyCount).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tc.kinds[e.kind]}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(e.created_at, locale, timeZone)} · {e.creatorName}
                  </p>
                  {describe(e) && <p className="mt-0.5 text-xs break-words text-gray-600">{describe(e)}</p>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className={`text-sm font-semibold ${e.delta > 0 ? "text-emerald-700" : e.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                    {signed(e.delta)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(tc.timesUnit, { n: e.balance })} {tc.remainingShort}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {credits.entries.length > historyCount && (
            <button
              type="button"
              onClick={() => setHistoryCount((n) => n + HISTORY_STEP)}
              className="mt-2 min-h-11 w-full rounded-xl border border-gray-300 bg-white text-sm font-medium"
            >
              {format(t.students.moreHistory, { n: credits.entries.length - historyCount })}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// 저장이 끝나면 한 번만 알려 주기 (같은 결과로 다시 부르지 않음)
function useSavedOnce(saved: number | undefined, onSaved: () => void) {
  const handled = useRef(saved);
  useEffect(() => {
    if (!saved || handled.current === saved) return;
    handled.current = saved;
    onSaved();
  }, [saved, onSaved]);
}

// ───── 플랜 추가: 횟수만 (결제일·시작일은 오늘), "더 보기"로 날짜·만료일·메모 ─────
function QuickPlan({ t, studentId, today, onSaved }: { t: Messages["credits"]; studentId: string; today: string; onSaved: () => void }) {
  const [state, onSubmit, pending] = useActionForm<PlanFormState>(savePlan, {});
  useSavedOnce(state.saved, onSaved);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-gray-200 p-3">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="stay" value="1" />
      <h3 className="text-sm font-semibold">➕ {t.addPlan}</h3>
      <div className="mt-2 flex items-end gap-2">
        <label className="block flex-1 text-xs font-medium text-gray-600">
          {t.credits}
          <input name="credits" type="number" inputMode="numeric" required min={1} max={PLAN_CREDITS_MAX} placeholder="10" className={`${field} min-h-11`} />
        </label>
        <button type="submit" disabled={pending} className="min-h-11 shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
      </div>
      <details className="mt-2">
        <summary className="min-h-8 cursor-pointer text-xs text-gray-500">{t.moreOptions}</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-gray-600">
            {t.paidOn}
            <input name="paid_on" type="date" required defaultValue={today} className={`${field} min-h-11`} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            {t.startsOn}
            <input name="starts_on" type="date" required defaultValue={today} className={`${field} min-h-11`} />
          </label>
          <label className="col-span-2 block text-xs font-medium text-gray-600">
            {t.expiresOn} <span className="font-normal text-gray-400">({t.expiresOnHint})</span>
            <input name="expires_on" type="date" className={`${field} min-h-11`} />
          </label>
          <label className="col-span-2 block text-xs font-medium text-gray-600">
            {t.memo}
            <input name="memo" placeholder={t.memoPlaceholder} className={`${field} min-h-11`} />
          </label>
        </div>
      </details>
      {errors.credits && <p className="mt-1 text-xs text-red-600">{format(t.errors.credits, { max: PLAN_CREDITS_MAX })}</p>}
      {errors.dates && <p className="mt-1 text-xs text-red-600">{t.errors.dates}</p>}
      {errors.expires && <p className="mt-1 text-xs text-red-600">{t.errors.expires}</p>}
      {errors.save && <p className="mt-1 text-xs text-red-600">{t.errors.save}</p>}
    </form>
  );
}

// ───── 횟수 조정: + / − , 횟수, 사유(필수) ─────
function QuickAdjust({ t, studentId, onSaved }: { t: Messages["credits"]; studentId: string; onSaved: () => void }) {
  const [state, onSubmit, pending] = useActionForm<AdjustFormState>(adjustCredits, {});
  useSavedOnce(state.saved, onSaved);
  const errors = state.errors ?? {};
  const choice =
    "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-gray-300 text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white";

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-gray-200 p-3">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="stay" value="1" />
      <h3 className="text-sm font-semibold">± {t.adjust}</h3>
      <div className="mt-2 flex gap-2">
        <label className={choice}>
          <input type="radio" name="direction" value="plus" defaultChecked className="sr-only" />
          {t.plus}
        </label>
        <label className={choice}>
          <input type="radio" name="direction" value="minus" className="sr-only" />
          {t.minus}
        </label>
      </div>
      {/* 횟수(좁게) 위, 사유(넓게) 아래 — field 의 w-full 이 좁은 폭을 덮어쓰지 않도록 폭은 감싸는 칸에서 정함 */}
      <div className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
        <label className="block text-xs font-medium text-gray-600">
          {t.amount}
          <input name="amount" type="number" inputMode="numeric" required min={1} max={ADJUST_MAX} defaultValue={1} className={`${field} min-h-11`} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          {t.reason}
          <input name="reason" required placeholder={t.reasonPlaceholder} className={`${field} min-h-11`} />
        </label>
      </div>
      <button type="submit" disabled={pending} className="mt-2 min-h-11 w-full rounded-lg border border-brand-300 bg-brand-50 text-sm font-semibold text-brand-700 disabled:opacity-60">
        {pending ? t.saving : t.save}
      </button>
      {errors.amount && <p className="mt-1 text-xs text-red-600">{format(t.errors.amount, { max: ADJUST_MAX })}</p>}
      {errors.reason && <p className="mt-1 text-xs text-red-600">{t.errors.reason}</p>}
      {errors.save && <p className="mt-1 text-xs text-red-600">{t.errors.save}</p>}
    </form>
  );
}
