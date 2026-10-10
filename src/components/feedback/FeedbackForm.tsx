"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveFeedback, type FeedbackFormState } from "@/lib/feedback-actions";
import { FEEDBACK_MAX } from "@/config/rules";
import type { Messages } from "@/i18n/server";
import { ErrorText, FormButtons } from "@/components/PlanForm";
import StudentCombobox from "@/components/StudentCombobox";
import { kindIcon } from "@/components/feedback/kinds";

type Kind = keyof typeof kindIcon;

type Props = {
  t: Messages["feedback"];
  students: { id: string; name: string }[];
  searchLabels: { placeholder: string; noMatch: string };
  back: string; // 저장·취소 후 돌아갈 곳
  initial: { id?: string; studentId: string; studentName?: string; kind: Kind; content: string };
};

// 피드백 쓰기·고치기 (고칠 때는 학생을 바꿀 수 없음)
export default function FeedbackForm({ t, students, searchLabels, back, initial }: Props) {
  const [state, onSubmit, pending] = useActionForm<FeedbackFormState>(saveFeedback, {});
  const [studentId, setStudentId] = useState(initial.studentId);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [content, setContent] = useState(initial.content);
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="back" value={back} />

      {initial.id ? (
        <p className="text-sm font-medium">
          {t.student}
          <span className="mt-1 block text-lg font-bold">{initial.studentName}</span>
        </p>
      ) : (
        <label className="block text-sm font-medium">
          {t.student}
          <StudentCombobox
            name="student_id"
            students={students}
            value={studentId}
            onChange={setStudentId}
            placeholder={searchLabels.placeholder}
            noMatch={searchLabels.noMatch}
            invalid={errors.student}
          />
          {errors.student && <ErrorText>{t.errors.student}</ErrorText>}
        </label>
      )}

      <fieldset>
        <legend className="text-sm font-medium">{t.kindLabel}</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(Object.keys(kindIcon) as Kind[]).map((k) => (
            <label
              key={k}
              className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <span aria-hidden className="text-lg leading-none">{kindIcon[k]}</span>
              {t.kinds[k]}
            </label>
          ))}
        </div>
        {errors.kind && <ErrorText>{t.errors.kind}</ErrorText>}
      </fieldset>

      <label className="block text-sm font-medium">
        {t.content}
        <textarea
          name="content"
          required
          rows={6}
          maxLength={FEEDBACK_MAX}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.contentPlaceholder[kind]}
          aria-invalid={errors.content || undefined}
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none aria-invalid:border-red-500"
        />
        <span className="mt-1 block text-right text-xs text-gray-400 tabular-nums">
          {content.length}/{FEEDBACK_MAX}
        </span>
        {errors.content && <ErrorText>{t.errors.content}</ErrorText>}
      </label>

      {errors.save && <ErrorText>{t.errors.save}</ErrorText>}
      {errors.setup && <ErrorText>{t.errors.setup}</ErrorText>}
      <FormButtons cancelHref={back} pending={pending} t={t} />
    </form>
  );
}
