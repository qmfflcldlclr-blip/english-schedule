"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { repeatLessons, type RepeatFormState } from "@/lib/schedule-actions";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN, REPEAT_MAX_WEEKS } from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { formatDay, toZoned } from "@/lib/time";
import { ErrorText, fieldClass } from "@/components/PlanForm";

type Props = {
  t: Messages["calendar"];
  students: { id: string; name: string; lesson_minutes: number }[];
  zoneLabel: string;
  timeZone: string;
  locale: string;
  initial: { studentId: string; startDate: string; duration: number };
};

export default function RepeatForm({ t, students, zoneLabel, timeZone, locale, initial }: Props) {
  const [state, onSubmit, pending] = useActionForm<RepeatFormState>(repeatLessons, {});
  const errors = state.errors ?? {};

  // 입력값을 직접 들고 있어서 미리보기 후에도 그대로 유지됨
  const [studentId, setStudentId] = useState(initial.studentId);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [time, setTime] = useState("16:00");
  const [weeks, setWeeks] = useState(8);
  const [duration, setDuration] = useState(initial.duration);
  // 미리보기 뒤에 입력을 바꾸면 미리보기를 숨김 (보이는 목록과 실제 생성 내용이 달라지지 않게)
  const [stale, setStale] = useState(false);
  const changed = <T,>(setter: (v: T) => void) => (v: T) => {
    setStale(true);
    setter(v);
  };

  const toggleDay = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));

  const preview = stale ? undefined : state.preview;
  const toCreate = preview?.filter((p) => !p.duplicate).length ?? 0;

  return (
    <form
      onSubmit={(e) => {
        setStale(false);
        onSubmit(e);
      }} className="flex flex-col gap-5">
      <label className="block text-sm font-medium">
        {t.student}
        <select
          name="student_id"
          required
          value={studentId}
          onChange={(e) => {
            changed(setStudentId)(e.target.value);
            const s = students.find((x) => x.id === e.target.value);
            if (s) changed(setDuration)(s.lesson_minutes);
          }}
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

      <fieldset>
        <legend className="text-sm font-medium">{t.weekdays}</legend>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {t.weekdayNames.map((name, d) => (
            <label
              key={d}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
            >
              <input type="checkbox" name="weekday" value={d} checked={weekdays.includes(d)} onChange={() => changed(toggleDay)(d)} className="sr-only" />
              {name}
            </label>
          ))}
        </div>
        {errors.weekdays && <ErrorText>{t.repeatErrors.weekdays}</ErrorText>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          {t.time}
          <input name="time" type="time" required step={300} value={time} onChange={(e) => changed(setTime)(e.target.value)} className={fieldClass} />
          {errors.time && <ErrorText>{t.errors.time}</ErrorText>}
        </label>
        <label className="block text-sm font-medium">
          {t.duration}
          <input
            name="duration_minutes"
            type="number"
            inputMode="numeric"
            required
            min={LESSON_MINUTES_MIN}
            max={LESSON_MINUTES_MAX}
            value={duration}
            onChange={(e) => changed(setDuration)(Number(e.target.value))}
            className={fieldClass}
          />
          {errors.duration && (
            <ErrorText>{format(t.errors.duration, { min: LESSON_MINUTES_MIN, max: LESSON_MINUTES_MAX })}</ErrorText>
          )}
        </label>
      </div>
      <p className="-mt-3 text-sm text-gray-500">{format(t.timeZoneHint, { zone: zoneLabel })}</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          {t.startDate}
          <input name="start_date" type="date" required value={startDate} onChange={(e) => changed(setStartDate)(e.target.value)} className={fieldClass} />
          {errors.date && <ErrorText>{t.errors.date}</ErrorText>}
        </label>
        <label className="block text-sm font-medium">
          {t.weeks}
          <div className="mt-1 flex items-center gap-2">
            <input
              name="weeks"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={REPEAT_MAX_WEEKS}
              value={weeks}
              onChange={(e) => changed(setWeeks)(Number(e.target.value))}
              className={`${fieldClass} mt-0`}
            />
            <span className="shrink-0 text-gray-600">{t.weeksUnit}</span>
          </div>
          {errors.weeks && <ErrorText>{format(t.repeatErrors.weeks, { max: REPEAT_MAX_WEEKS })}</ErrorText>}
        </label>
      </div>

      <button
        type="submit"
        name="mode"
        value="preview"
        disabled={pending}
        className="min-h-12 rounded-xl border border-gray-300 bg-white font-medium disabled:opacity-60"
      >
        {pending ? t.previewing : t.preview}
      </button>

      {preview && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <h2 className="font-semibold">{format(t.previewTitle, { n: toCreate })}</h2>
          <ul className="mt-2 max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {preview.map((p) => (
              <li key={p.startsAt} className={`flex items-center justify-between gap-3 py-2 text-sm ${p.duplicate ? "text-gray-400" : ""}`}>
                <span className="tabular-nums">
                  {formatDay(p.date, locale)} {toZoned(p.startsAt, timeZone).time}
                </span>
                {p.duplicate ? (
                  <span className="text-xs">{t.alreadyExists}</span>
                ) : (
                  p.overlap && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{t.overlapsOther}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-500">{t.repeatHint}</p>
          {errors.save && <ErrorText>{t.errors.save}</ErrorText>}
          {toCreate === 0 ? (
            <p className="mt-3 text-sm text-gray-600">{t.nothingToCreate}</p>
          ) : (
            <button
              type="submit"
              name="mode"
              value="create"
              disabled={pending}
              className="mt-3 min-h-12 w-full rounded-xl bg-brand-600 font-medium text-white disabled:opacity-60"
            >
              {pending ? t.creating : format(t.createN, { n: toCreate })}
            </button>
          )}
        </section>
      )}
    </form>
  );
}
