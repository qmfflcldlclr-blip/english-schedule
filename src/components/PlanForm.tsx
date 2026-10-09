"use client";

import Link from "next/link";
import { useActionForm } from "@/lib/use-action-form";
import { savePlan, type PlanFormState } from "@/lib/credit-actions";
import { PLAN_CREDITS_MAX } from "@/config/rules";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { PlanRow } from "@/lib/credit-math";

type Props = {
  t: Messages["credits"];
  studentId: string;
  today: string;
  plan?: PlanRow; // 있으면 수정 모드 (횟수는 고정)
};

export const fieldClass =
  "mt-1 min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base focus:border-gray-900 focus:outline-none aria-invalid:border-red-500";

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-sm text-red-600">{children}</span>;
}

export function FormButtons({
  cancelHref,
  pending,
  t,
}: {
  cancelHref: string;
  pending: boolean;
  t: { cancel: string; save: string; saving: string };
}) {
  return (
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
  );
}

export default function PlanForm({ t, studentId, today, plan }: Props) {
  const [state, onSubmit, pending] = useActionForm<PlanFormState>(
    savePlan,
    {},
  );
  const errors = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="student_id" value={studentId} />
      {plan && <input type="hidden" name="plan_id" value={plan.id} />}

      <label className="block text-sm font-medium">
        {t.credits}
        <input
          name="credits"
          type="number"
          inputMode="numeric"
          required={!plan}
          disabled={Boolean(plan)}
          min={1}
          max={PLAN_CREDITS_MAX}
          defaultValue={plan?.credits}
          aria-invalid={errors.credits || undefined}
          className={`${fieldClass} w-32 disabled:bg-gray-100 disabled:text-gray-500`}
        />
        {plan && (
          <span className="mt-1 block text-sm font-normal text-gray-500">
            {t.creditsLocked}
          </span>
        )}
        {errors.credits && (
          <ErrorText>{format(t.errors.credits, { max: PLAN_CREDITS_MAX })}</ErrorText>
        )}
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {t.paidOn}
          <input
            name="paid_on"
            type="date"
            required
            defaultValue={plan?.paid_on ?? today}
            aria-invalid={errors.dates || undefined}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          {t.startsOn}
          <input
            name="starts_on"
            type="date"
            required
            defaultValue={plan?.starts_on ?? today}
            aria-invalid={errors.dates || undefined}
            className={fieldClass}
          />
        </label>
      </div>
      {errors.dates && <ErrorText>{t.errors.dates}</ErrorText>}

      <label className="block text-sm font-medium">
        {t.expiresOn}
        <input
          name="expires_on"
          type="date"
          defaultValue={plan?.expires_on ?? ""}
          aria-invalid={errors.expires || undefined}
          className={fieldClass}
        />
        <span className="mt-1 block text-sm font-normal text-gray-500">
          {t.expiresOnHint}
        </span>
        {errors.expires && <ErrorText>{t.errors.expires}</ErrorText>}
      </label>

      <label className="block text-sm font-medium">
        {t.memo}
        <textarea
          name="memo"
          rows={3}
          defaultValue={plan?.memo ?? ""}
          placeholder={t.memoPlaceholder}
          className={`${fieldClass} py-2.5`}
        />
      </label>

      {errors.save && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors.save}
        </p>
      )}

      <FormButtons cancelHref={`/students/${studentId}`} pending={pending} t={t} />
    </form>
  );
}
