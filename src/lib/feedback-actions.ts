"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_MAX } from "@/config/rules";
import { safeInternalPath } from "@/lib/safe-path";

export type FeedbackFormState = { errors?: { student?: boolean; kind?: boolean; content?: boolean; save?: boolean } };

const KINDS = ["good", "improve", "note"];

// 피드백 쓰기·고치기. 폼에 id 가 있으면 고치기 (작성자만 — 데이터베이스가 확인)
export async function saveFeedback(_prev: FeedbackFormState, formData: FormData): Promise<FeedbackFormState> {
  const id = String(formData.get("id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  const errors: NonNullable<FeedbackFormState["errors"]> = {};
  if (!id && !studentId) errors.student = true;
  if (!KINDS.includes(kind)) errors.kind = true;
  if (!content || content.length > FEEDBACK_MAX) errors.content = true;
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  if (id) {
    const { count, error } = await supabase
      .from("student_feedback")
      .update({ kind, content }, { count: "exact" })
      .eq("id", id);
    if (error || !count) return { errors: { save: true } };
  } else {
    const { error } = await supabase.from("student_feedback").insert({ student_id: studentId, kind, content });
    if (error) return { errors: { save: true } };
  }
  redirect(safeInternalPath(formData.get("back"), "/feedback"));
}

export async function deleteFeedback(id: string, back: string) {
  const supabase = await createClient();
  await supabase.from("student_feedback").delete().eq("id", id);
  redirect(safeInternalPath(back, "/feedback"));
}
