"use client";

import { useState } from "react";
import Link from "next/link";
import { romanizeName } from "@/lib/romanize";
import { useActionForm } from "@/lib/use-action-form";
import { saveStudent, type StudentFormState } from "@/lib/student-actions";
import {
  DEFAULT_LESSON_MINUTES,
  LESSON_LENGTHS,
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
  const [state, onSubmit, pending] = useActionForm<StudentFormState>(saveStudent, {});
  const errors = state.errors ?? {};
  const [name, setName] = useState(student?.name ?? ""); // 영어 이름 자동 변환 미리보기용

  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-300 px-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none aria-invalid:border-red-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {student && <input type="hidden" name="id" value={student.id} />}

      <label className="block text-sm font-medium">
        {t.name}
        <input
          name="name"
          required
          defaultValue={student?.name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name || undefined}
          className={`${inputClass} min-h-12`}
        />
        {errors.name && (
          <span className="mt-1 block text-sm text-red-600">{t.errors.name}</span>
        )}
      </label>

      <label className="block text-sm font-medium">
        {t.nameEn}
        <input
          name="name_en"
          defaultValue={student?.name_en ?? ""}
          placeholder={romanizeName(name)}
          autoCapitalize="words"
          className={`${inputClass} min-h-12`}
        />
        {name.trim() && (
          <span className="mt-1 block text-sm font-normal text-gray-500">
            {format(t.nameEnHint, { auto: romanizeName(name) })}
          </span>
        )}
      </label>

      {/* 수업 길이: 새 학생은 무조건 30분이라 수정할 때만 보임 */}
      {student && (
        <label className="block text-sm font-medium">
          {t.lessonMinutes}
          <select
            name="lesson_minutes"
            required
            defaultValue={student?.lesson_minutes ?? DEFAULT_LESSON_MINUTES}
            aria-invalid={errors.minutes || undefined}
            className={`${inputClass} mt-1 min-h-12 w-40`}
          >
            {LESSON_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m} {t.minutes}
              </option>
            ))}
          </select>
          {errors.minutes && <span className="mt-1 block text-sm text-red-600">{t.errors.minutes}</span>}
        </label>
      )}

      {errors.save && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors.save}
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href={cancelHref}
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white font-medium"
        >
          {t.cancel}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-1 rounded-xl bg-brand-600 font-medium text-white disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
