"use client";

import { useEffect, useRef, useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveLesson, type LessonFormState } from "@/lib/lesson-actions";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN } from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { ErrorText, FormButtons, fieldClass } from "@/components/PlanForm";
import StudentCombobox from "@/components/StudentCombobox";

type StudentOption = { id: string; name: string; lesson_minutes: number };

type Props = {
  t: Messages["calendar"];
  students: StudentOption[];
  zoneLabel: string; // "한국" 등 — 입력 기준 시간대 안내용
  cancelHref: string;
  keepDuration?: boolean; // 달력에서 드래그로 길이를 정해 왔으면 학생을 골라도 길이를 바꾸지 않음
  // 달력 옆 칸에서 쓸 때: 저장해도 페이지를 옮기지 않고 onSaved 호출
  panel?: {
    onCancel: () => void;
    onSaved: (saved: NonNullable<LessonFormState["saved"]>) => void;
    // 달력에서 빈 시간을 누를 때마다 바뀜 (n 이 바뀌면 날짜·시각을 새로 받음)
    slot?: { date: string; time: string; duration?: number; n: number };
  };
  initial: {
    lessonId?: string;
    studentId: string;
    date: string;
    time: string;
    duration: number;
    memo: string;
  };
};

export default function LessonForm({ t, students, zoneLabel, cancelHref, keepDuration, panel, initial }: Props) {
  const [state, onSubmit, pending] = useActionForm<LessonFormState>(saveLesson, {});
  // 값을 직접 들고 있어서, 경고·오류가 나도 입력한 내용이 사라지지 않음
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: key === "duration" ? Number(e.target.value) : e.target.value }));
  const errors = state.errors ?? {};

  // 옆 칸에서 빈 시간을 다시 고르면 날짜·시각(·드래그 길이)만 바꿈. 고른 학생·메모는 그대로
  const slot = panel?.slot;
  const [slotN, setSlotN] = useState(slot?.n);
  if (slot && slot.n !== slotN) {
    setSlotN(slot.n);
    setValues((v) => ({ ...v, date: slot.date, time: slot.time, duration: slot.duration ?? v.duration }));
  }

  // 옆 칸에서 저장이 끝나면 알려 줌. 같은 저장 결과로는 한 번만
  // (onSaved 는 화면을 그릴 때마다 새로 만들어져서, 이걸 기억하지 않으면 저장 → 새로고침 → 또 저장 알림이 끝없이 반복됨)
  const onSaved = panel?.onSaved;
  const handled = useRef(state.saved);
  useEffect(() => {
    if (!state.saved || handled.current === state.saved) return;
    handled.current = state.saved;
    onSaved?.(state.saved);
  }, [state.saved, onSaved]);

  // 학생을 고르면 그 학생의 수업 길이로 자동 변경 (달력에서 드래그로 길이를 정해 왔으면 유지)
  const chooseStudent = (id: string) => {
    const s = students.find((x) => x.id === id);
    setValues((v) => ({
      ...v,
      studentId: id,
      duration: keepDuration ? v.duration : (s?.lesson_minutes ?? v.duration),
    }));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {values.lessonId && <input type="hidden" name="lesson_id" value={values.lessonId} />}
      {panel && <input type="hidden" name="stay" value="1" />}

      <label className="block text-sm font-medium">
        {t.student}
        <StudentCombobox
          name="student_id"
          students={students}
          value={values.studentId}
          onChange={chooseStudent}
          placeholder={t.searchStudent}
          noMatch={t.noMatch}
          invalid={errors.student}
        />
        {errors.student && <ErrorText>{t.errors.student}</ErrorText>}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          {t.date}
          <input name="date" type="date" required value={values.date} onChange={set("date")} aria-invalid={errors.date || undefined} className={fieldClass} />
          {errors.date && <ErrorText>{t.errors.date}</ErrorText>}
        </label>
        <label className="block text-sm font-medium">
          {t.time}
          <input name="time" type="time" required step={300} value={values.time} onChange={set("time")} aria-invalid={errors.time || undefined} className={fieldClass} />
          {errors.time && <ErrorText>{t.errors.time}</ErrorText>}
        </label>
      </div>
      <p className="-mt-3 text-sm text-gray-500">{format(t.timeZoneHint, { zone: zoneLabel })}</p>

      <label className="block text-sm font-medium">
        {t.duration}
        <div className="mt-1 flex items-center gap-2">
          <input
            name="duration_minutes"
            type="number"
            inputMode="numeric"
            required
            min={LESSON_MINUTES_MIN}
            max={LESSON_MINUTES_MAX}
            value={values.duration}
            onChange={set("duration")}
            aria-invalid={errors.duration || undefined}
            className={`${fieldClass} mt-0 w-28`}
          />
          <span className="text-gray-600">{format(t.minutesUnit, { n: "" }).trim()}</span>
        </div>
        {errors.duration && (
          <ErrorText>{format(t.errors.duration, { min: LESSON_MINUTES_MIN, max: LESSON_MINUTES_MAX })}</ErrorText>
        )}
      </label>

      <label className="block text-sm font-medium">
        {t.memo}
        <input name="memo" value={values.memo} onChange={set("memo")} placeholder={t.memoPlaceholder} className={fieldClass} />
      </label>

      {state.overlaps && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{t.overlapTitle}</p>
          <ul className="mt-1 list-disc pl-5">
            {state.overlaps.map((o, i) => (
              <li key={i}>{format(t.overlapItem, { time: o.time, name: o.name, n: o.minutes })}</li>
            ))}
          </ul>
          <button
            type="submit"
            name="ignore_overlap"
            value="1"
            disabled={pending}
            className="mt-3 min-h-11 w-full rounded-xl border border-amber-400 bg-white font-medium disabled:opacity-60"
          >
            {t.saveAnyway}
          </button>
        </div>
      )}

      {errors.save && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors.save}
        </p>
      )}

      <FormButtons cancelHref={cancelHref} onCancel={panel?.onCancel} pending={pending} t={t} />
    </form>
  );
}
