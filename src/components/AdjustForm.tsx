"use client";

import { useActionForm } from "@/lib/use-action-form";
import { adjustCredits, type AdjustFormState } from "@/lib/credit-actions";
import { ADJUST_MAX } from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { ErrorText, FormButtons, fieldClass } from "./PlanForm";

type Props = { t: Messages["credits"]; studentId: string };

export default function AdjustForm({ t, studentId }: Props) {
  const [state, onSubmit, pending] = useActionForm<AdjustFormState>(adjustCredits, {});
  const errors = state.errors ?? {};

  const choice =
    "flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border border-gray-300 font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="student_id" value={studentId} />

      <fieldset>
        <legend className="text-sm font-medium">{t.direction}</legend>
        <div className="mt-1 flex gap-3">
          <label className={choice}>
            <input type="radio" name="direction" value="plus" defaultChecked className="sr-only" />
            {t.plus}
          </label>
          <label className={choice}>
            <input type="radio" name="direction" value="minus" className="sr-only" />
            {t.minus}
          </label>
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        {t.amount}
        <input
          name="amount"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={ADJUST_MAX}
          defaultValue={1}
          aria-invalid={errors.amount || undefined}
          className={`${fieldClass} w-32`}
        />
        {errors.amount && (
          <ErrorText>{format(t.errors.amount, { max: ADJUST_MAX })}</ErrorText>
        )}
      </label>

      <label className="block text-sm font-medium">
        {t.reason}
        <input
          name="reason"
          required
          placeholder={t.reasonPlaceholder}
          aria-invalid={errors.reason || undefined}
          className={fieldClass}
        />
        {errors.reason && <ErrorText>{t.errors.reason}</ErrorText>}
      </label>

      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t.adjustHint}</p>

      {errors.save && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors.save}
        </p>
      )}

      <FormButtons cancelHref={`/students/${studentId}`} pending={pending} t={t} />
    </form>
  );
}
