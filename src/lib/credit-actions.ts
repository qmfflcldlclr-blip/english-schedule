"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ADJUST_MAX, isPlanCredits } from "@/config/rules";

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

// 플랜 등록(planId 없음) 또는 수정(planId 있음: 종류·결제일·만료일·메모)
// 시작일은 따로 받지 않음: 새 플랜은 결제일로 순서만 정하고, 실제 시작·종료 수업은 화면에서 계산 (plan-timeline)
export async function savePlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const studentId = String(formData.get("student_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const credits = Number(formData.get("credits"));
  const oldCredits = Number(formData.get("old_credits")); // 수정: 원래 횟수 (예전 특이 플랜은 그대로 둘 수 있게)
  const paidOn = String(formData.get("paid_on") ?? "");
  const expiresOn = String(formData.get("expires_on") ?? "") || null;
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const creditsChanged = !planId || credits !== oldCredits;

  const errors: NonNullable<PlanFormState["errors"]> = {};
  if (creditsChanged && !isPlanCredits(credits)) errors.credits = true;
  if (!DATE.test(paidOn)) errors.dates = true;
  if (expiresOn && (!DATE.test(expiresOn) || expiresOn < paidOn)) {
    errors.expires = true;
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const fields = { paid_on: paidOn, expires_on: expiresOn, memo };

  if (planId) {
    const { error } = await supabase.from("plans").update(fields).eq("id", planId);
    if (error) return { errors: { save: true } };
    if (creditsChanged) {
      // 횟수 변경은 데이터베이스 함수로만 (차이만큼 기록이 함께 남음, SQL 0019)
      const { error: changeError } = await supabase.rpc("change_plan_credits", { p_plan_id: planId, p_credits: credits });
      if (changeError) return { errors: { save: true } };
    }
  } else {
    const { data: auth } = await supabase.auth.getClaims();
    const { error } = await supabase.from("plans").insert({
      student_id: studentId,
      credits,
      created_by: auth?.claims?.sub,
      starts_on: paidOn,
      ...fields,
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
