"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveStudent, type StudentFormState } from "@/lib/student-actions";
import {
  DEFAULT_LESSON_MINUTES,
  LESSON_MINUTES_MAX,
  LESSON_MINUTES_MIN,
} from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { Student } from "@/lib/students";

type Props = {
  t: Messages["students"];
  student?: Student;
  cancelHref: string;
};

export default function StudentForm({ t, student, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<
    StudentFormState,
    FormData
  >(saveStudent, {});
  const errors = state.errors ?? {};

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-gray-900 focus:outline-none aria-invalid:border-red-500";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {student && <input type="hidden" name="id" value={student.id} />}

      <label className="block text-sm font-medium">
        {t.name}
        <input
          name="name"
          required
          defaultValue={student?.name}
          aria-invalid={errors.name || undefined}
          className={`${inputClass} min-h-12`}
        />
        {errors.name && (
          <span className="mt-1 block text-sm text-red-600">{t.errors.name}</span>
        )}
      </label>

      <label className="block text-sm font-medium">
        {t.lessonMinutes}
        <div className="mt-1 flex items-center gap-2">
          <input
            name="lesson_minutes"
            type="number"
            inputMode="numeric"
            required
            min={LESSON_MINUTES_MIN}
            max={LESSON_MINUTES_MAX}
            defaultValue={student?.lesson_minutes ?? DEFAULT_LESSON_MINUTES}
            aria-invalid={errors.minutes || undefined}
            className={`${inputClass} mt-0 min-h-12 w-28`}
          />
          <span className="text-gray-600">
            {t.minutes}
          </span>
        </div>
        {errors.minutes && (
          <span className="mt-1 block text-sm text-red-600">
            {format(t.errors.minutes, {
              min: LESSON_MINUTES_MIN,
              max: LESSON_MINUTES_MAX,
            })}
          </span>
        )}
      </label>

      <label className="block text-sm font-medium">
        {t.memo}
        <textarea
          name="memo"
          rows={4}
          defaultValue={student?.memo ?? ""}
          placeholder={t.memoPlaceholder}
          className={`${inputClass} py-2.5`}
        />
      </label>

      {errors.save && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors.save}
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href={cancelHref}
          className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-gray-300 font-medium"
        >
          {t.cancel}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-lg bg-gray-900 font-medium text-white disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
