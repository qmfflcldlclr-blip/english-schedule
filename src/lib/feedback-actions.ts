"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_MAX } from "@/config/rules";
import { safeInternalPath } from "@/lib/safe-path";
import { isMissingTable } from "@/lib/db-errors";

export type FeedbackFormState = { errors?: { student?: boolean; kind?: boolean; content?: boolean; save?: boolean; setup?: boolean } };

export type LessonFeedbackResult = { ok: true } | { error: "kind" | "content" | "save" | "setup" };

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
    if (isMissingTable(error)) return { errors: { setup: true } };
    if (error || !count) return { errors: { save: true } };
  } else {
    const { error } = await supabase.from("student_feedback").insert({ student_id: studentId, kind, content });
    if (isMissingTable(error)) return { errors: { setup: true } };
    if (error) return { errors: { save: true } };
  }
  redirect(safeInternalPath(formData.get("back"), "/feedback"));
}

export async function deleteFeedback(id: string, back: string) {
  const supabase = await createClient();
  await supabase.from("student_feedback").delete().eq("id", id);
  redirect(safeInternalPath(back, "/feedback"));
}

// 달력 옆 칸: 수업에 피드백 쓰기. 학생은 수업에서 가져옴 (페이지 이동 없음)
export async function addLessonFeedback(lessonId: string, kind: string, content: string): Promise<LessonFeedbackResult> {
  const text = content.trim();
  if (!KINDS.includes(kind)) return { error: "kind" };
  if (!text || text.length > FEEDBACK_MAX) return { error: "content" };
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("student_id").eq("id", lessonId).maybeSingle();
  if (!lesson) return { error: "save" };
  const { error } = await supabase
    .from("student_feedback")
    .insert({ student_id: lesson.student_id, lesson_id: lessonId, kind, content: text });
  if (isMissingTable(error) || error?.code === "42703" || error?.code === "PGRST204") return { error: "setup" };
  if (error) return { error: "save" };
  revalidatePath("/feedback");
  return { ok: true };
}

// 달력 옆 칸: 내 피드백 지우기 (작성자만 — 데이터베이스가 확인)
export async function removeFeedback(id: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("student_feedback").delete({ count: "exact" }).eq("id", id);
  revalidatePath("/feedback");
  return count ? {} : { error: true };
}
