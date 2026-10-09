"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN } from "@/config/rules";
import { fromZoned, isDate, isTime, toZoned } from "@/lib/time";

export type LessonFormState = {
  errors?: {
    student?: boolean;
    date?: boolean;
    time?: boolean;
    duration?: boolean;
    save?: boolean;
  };
  // 겹치는 수업 경고 (사용자가 "그래도 저장"을 누르면 무시하고 저장)
  overlaps?: { time: string; name: string; minutes: number }[];
};

// 수업 추가(lesson_id 없음) / 수정(있음). 시간은 입력한 사람의 시간대 기준
export async function saveLesson(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const lessonId = String(formData.get("lesson_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const date = formData.get("date");
  const time = formData.get("time");
  const duration = Number(formData.get("duration_minutes"));
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const ignoreOverlap = formData.get("ignore_overlap") === "1";

  const errors: NonNullable<LessonFormState["errors"]> = {};
  if (!studentId) errors.student = true;
  if (!isDate(date)) errors.date = true;
  if (!isTime(time)) errors.time = true;
  if (
    !Number.isInteger(duration) ||
    duration < LESSON_MINUTES_MIN ||
    duration > LESSON_MINUTES_MAX
  ) {
    errors.duration = true;
  }
  if (Object.keys(errors).length) return { errors };

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const timeZone = profile.timezone as string;
  const start = fromZoned(date as string, time as string, timeZone);
  const end = new Date(start.getTime() + duration * 60_000);

  const supabase = await createClient();

  // 겹치는 수업 확인: 같은 날 앞뒤 수업 중 시간이 겹치는 것 (무료 취소된 수업은 제외)
  if (!ignoreOverlap) {
    const { data: nearby } = await supabase
      .from("lessons")
      .select("id, starts_at, duration_minutes, student:students(name)")
      .neq("status", "free_cancel")
      .gte("starts_at", new Date(start.getTime() - LESSON_MINUTES_MAX * 60_000).toISOString())
      .lt("starts_at", end.toISOString());
    const overlaps = (nearby ?? [])
      .filter((l) => l.id !== lessonId)
      .filter(
        (l) =>
          new Date(l.starts_at).getTime() + l.duration_minutes * 60_000 >
          start.getTime(),
      )
      .map((l) => {
        const s = Array.isArray(l.student) ? l.student[0] : l.student;
        return {
          time: toZoned(l.starts_at, timeZone).time,
          name: (s as { name: string } | null)?.name ?? "",
          minutes: l.duration_minutes,
        };
      });
    if (overlaps.length) return { overlaps };
  }

  const values = {
    student_id: studentId,
    starts_at: start.toISOString(),
    duration_minutes: duration,
    memo,
  };
  const { error } = lessonId
    ? await supabase.from("lessons").update(values).eq("id", lessonId)
    : await supabase.from("lessons").insert({ ...values, created_by: profile.id });
  if (error) return { errors: { save: true } };

  redirect(`/calendar?date=${date}`);
}

// 예정 수업 삭제 (처리된 수업은 데이터베이스가 거부)
export async function deleteLesson(lessonId: string, date: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("lessons")
    .delete({ count: "exact" })
    .eq("id", lessonId);
  if (!count) return { error: true };
  redirect(`/calendar?date=${isDate(date) ? date : ""}`);
}
