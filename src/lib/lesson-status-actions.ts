"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLesson, getRemaining } from "@/lib/lessons";
import { createClient } from "@/lib/supabase/server";
import { creditUnits } from "@/config/rules";

// cancel = 연기 (선생님·매니저가 직접 고를 때만, 차감 없음)
export type StatusAction = "complete" | "absent" | "cancel" | "revert";

// 완료 / 결석 / 연기 / 되돌리기. 성공하면 수업 화면을 새로 그림
export async function changeLessonStatus(lessonId: string, action: StatusAction): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lesson_status", { p_lesson_id: lessonId, p_action: action });
  if (error) {
    const known = ["already_processed", "not_processed"];
    return { error: known.find((code) => error.message.includes(code)) ?? "unknown" };
  }
  redirect(`/calendar/lessons/${lessonId}`);
}

export type QuickResult = { ok: true } | { error: string } | { confirmRemaining: number };

// 달력에서 바로 완료·결석·연기 (화면 이동 없이 달력만 새로 그림)
// 완료인데 남은 횟수가 0회 이하면 먼저 한 번 더 확인받음 (force=true 로 다시 호출)
export async function quickLessonStatus(
  lessonId: string,
  action: "complete" | "absent" | "cancel",
  force = false,
): Promise<QuickResult> {
  if (action === "complete" && !force) {
    const lesson = await getLesson(lessonId);
    if (!lesson) return { error: "unknown" };
    const remaining = await getRemaining(lesson.student_id);
    // 이 수업만큼(예: 60분 = 2회) 빼면 마이너스가 되면 한 번 더 확인
    if (remaining < creditUnits(lesson.duration_minutes)) return { confirmRemaining: remaining };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lesson_status", { p_lesson_id: lessonId, p_action: action });
  if (error) {
    const known = ["already_processed", "not_processed"];
    return { error: known.find((code) => error.message.includes(code)) ?? "unknown" };
  }
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true };
}
