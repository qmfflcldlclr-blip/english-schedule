"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { fromZoned, isDate, isTime } from "@/lib/time";

export type CancelReason = "early_first" | "within_hour" | "monthly_limit";
export type CancelPreview =
  | { free: boolean; reason: CancelReason; cancels: number }
  | { error: string };

export type StatusAction = "complete" | "absent" | "cancel" | "revert";

// 입력한 날짜·시각(내 시간대) → 실제 순간. 비어 있으면 null(= 지금)
async function cancelInstant(date?: string, time?: string) {
  if (!isDate(date) || !isTime(time)) return null;
  const profile = await getCurrentProfile();
  return fromZoned(date, time, (profile?.timezone as string) ?? "UTC");
}

// 취소하면 무료인지 차감인지 미리 확인 (실제 처리와 같은 데이터베이스 규칙 사용)
export async function previewCancel(
  lessonId: string,
  date?: string,
  time?: string,
): Promise<CancelPreview> {
  const at = await cancelInstant(date, time);
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("preview_cancel", {
      p_lesson_id: lessonId,
      ...(at ? { p_cancelled_at: at.toISOString() } : {}),
    })
    .single<{ free: boolean; reason: CancelReason; cancels_this_month: number }>();
  if (error || !data) return { error: "unknown" };
  return { free: data.free, reason: data.reason, cancels: data.cancels_this_month };
}

// 완료 / 결석 / 취소 / 되돌리기. 성공하면 수업 화면을 새로 그림
export async function changeLessonStatus(
  lessonId: string,
  action: StatusAction,
  date?: string,
  time?: string,
): Promise<{ error: string } | void> {
  const at = action === "cancel" ? await cancelInstant(date, time) : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lesson_status", {
    p_lesson_id: lessonId,
    p_action: action,
    ...(at ? { p_cancelled_at: at.toISOString() } : {}),
  });
  if (error) {
    const known = ["already_processed", "cancel_time_in_future", "not_processed"];
    return { error: known.find((code) => error.message.includes(code)) ?? "unknown" };
  }
  redirect(`/calendar/lessons/${lessonId}`);
}
