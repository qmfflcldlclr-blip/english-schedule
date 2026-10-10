"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveLesson, type LessonFormState } from "@/lib/lesson-actions";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN } from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { ErrorText, FormButtons, fieldClass } from "@/components/PlanForm";

type StudentOption = { id: string; name: string; lesson_minutes: number };

type Props = {
  t: Messages["calendar"];
  students: StudentOption[];
  zoneLabel: string; // "한국" 등 — 입력 기준 시간대 안내용
  cancelHref: string;
  initial: {
    lessonId?: string;
    studentId: string;
    date: string;
    time: string;
    duration: number;
    memo: string;
  };
};

export default function LessonForm({ t, students, zoneLabel, cancelHref, initial }: Props) {
  const [state, onSubmit, pending] = useActionForm<LessonFormState>(saveLesson, {});
  // 값을 직접 들고 있어서, 경고·오류가 나도 입력한 내용이 사라지지 않음
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: key === "duration" ? Number(e.target.value) : e.target.value }));
  const errors = state.errors ?? {};

  // 학생을 고르면 그 학생의 수업 길이로 자동 변경
  const chooseStudent = (id: string) => {
    const s = students.find((x) => x.id === id);
    setValues((v) => ({ ...v, studentId: id, duration: s?.lesson_minutes ?? v.duration }));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {values.lessonId && <input type="hidden" name="lesson_id" value={values.lessonId} />}

      <label className="block text-sm font-medium">
        {t.student}
        <select
          name="student_id"
          required
          value={values.studentId}
          onChange={(e) => chooseStudent(e.target.value)}
          aria-invalid={errors.student || undefined}
          className={fieldClass}
        >
          <option value="" disabled>
            {t.chooseStudent}
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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

      <FormButtons cancelHref={cancelHref} pending={pending} t={t} />
    </form>
  );
}
