"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ADJUST_MAX, PLAN_CREDITS_MAX } from "@/config/rules";

export type PlanFormState = {
  errors?: {
    credits?: boolean;
    dates?: boolean;
    expires?: boolean;
    save?: boolean;
  };
  saved?: number; // 학생 목록 옆 칸에서 저장한 경우: 페이지를 옮기지 않고 저장 시각(매번 다름)만 돌려줌
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 플랜 등록(planId 없음) 또는 수정(planId 있음: 날짜·메모만)
export async function savePlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const studentId = String(formData.get("student_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const credits = Number(formData.get("credits"));
  const paidOn = String(formData.get("paid_on") ?? "");
  const startsOn = String(formData.get("starts_on") ?? "");
  const expiresOn = String(formData.get("expires_on") ?? "") || null;
  const memo = String(formData.get("memo") ?? "").trim() || null;

  const errors: NonNullable<PlanFormState["errors"]> = {};
  if (
    !planId &&
    (!Number.isInteger(credits) || credits < 1 || credits > PLAN_CREDITS_MAX)
  ) {
    errors.credits = true;
  }
  if (!DATE.test(paidOn) || !DATE.test(startsOn)) errors.dates = true;
  if (expiresOn && (!DATE.test(expiresOn) || expiresOn < startsOn)) {
    errors.expires = true;
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const dates = {
    paid_on: paidOn,
    starts_on: startsOn,
    expires_on: expiresOn,
    memo,
  };

  if (planId) {
    const { error } = await supabase.from("plans").update(dates).eq("id", planId);
    if (error) return { errors: { save: true } };
  } else {
    const { data: auth } = await supabase.auth.getClaims();
    const { error } = await supabase.from("plans").insert({
      student_id: studentId,
      credits,
      created_by: auth?.claims?.sub,
      ...dates,
    });
    if (error) return { errors: { save: true } };
  }

  if (formData.get("stay") === "1") {
    revalidatePath("/students");
    return { saved: Date.now() };
  }
  redirect(`/students/${studentId}`);
}

export type AdjustFormState = {
  errors?: { amount?: boolean; reason?: boolean; save?: boolean };
  saved?: number; // 옆 칸에서 저장한 경우 (위와 같음)
};

// 수동 조정: +N 또는 −N, 사유 필수
export async function adjustCredits(
  _prev: AdjustFormState,
  formData: FormData,
): Promise<AdjustFormState> {
  const studentId = String(formData.get("student_id") ?? "");
  const sign = formData.get("direction") === "minus" ? -1 : 1;
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();

  const errors: NonNullable<AdjustFormState["errors"]> = {};
  if (!Number.isInteger(amount) || amount < 1 || amount > ADJUST_MAX) {
    errors.amount = true;
  }
  if (!reason) errors.reason = true;
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { error } = await supabase.from("credit_entries").insert({
    student_id: studentId,
    delta: sign * amount,
    kind: "adjust",
    reason,
    created_by: auth?.claims?.sub,
  });
  if (error) return { errors: { save: true } };

  if (formData.get("stay") === "1") {
    revalidatePath("/students");
    return { saved: Date.now() };
  }
  redirect(`/students/${studentId}`);
}
