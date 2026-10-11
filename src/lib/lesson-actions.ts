"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN, NOTE_MAX } from "@/config/rules";
import { isMissingFunction } from "@/lib/db-errors";
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
  // 달력 옆 칸에서 저장한 경우: 페이지를 옮기지 않고 결과만 돌려줌
  saved?: { lessonId: string; studentId: string; date: string };
};

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Overlap = NonNullable<LessonFormState["overlaps"]>[number];

// 겹치는 수업 확인: 같은 날 앞뒤 수업 중 시간이 겹치는 것 (무료 취소된 수업, 자기 자신은 제외)
async function findOverlaps(
  supabase: Supabase,
  start: Date,
  end: Date,
  lessonId: string,
  timeZone: string,
): Promise<Overlap[]> {
  const { data: nearby } = await supabase
    .from("lessons")
    .select("id, starts_at, duration_minutes, student:students(name)")
    .neq("status", "free_cancel")
    .gte("starts_at", new Date(start.getTime() - LESSON_MINUTES_MAX * 60_000).toISOString())
    .lt("starts_at", end.toISOString());
  return (nearby ?? [])
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
}

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
  // 노트 칸이 없는 폼(옆 칸 "수업 수정")에서는 노트를 건드리지 않음 (옆 칸 노트 상자에서 따로 저장)
  const hasMemo = formData.has("memo");
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const ignoreOverlap = formData.get("ignore_overlap") === "1";
  const stay = formData.get("stay") === "1"; // 달력 옆 칸에서 보냄 → 이동하지 않음

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

  if (!ignoreOverlap) {
    const overlaps = await findOverlaps(supabase, start, end, lessonId, timeZone);
    if (overlaps.length) return { overlaps };
  }

  const values = {
    student_id: studentId,
    starts_at: start.toISOString(),
    duration_minutes: duration,
    ...(hasMemo ? { memo } : {}),
  };
  const { data: row, error } = lessonId
    ? await supabase.from("lessons").update(values).eq("id", lessonId).select("id").maybeSingle()
    : await supabase.from("lessons").insert({ ...values, created_by: profile.id }).select("id").single();
  if (error || !row) return { errors: { save: true } };

  if (stay) return { saved: { lessonId: row.id, studentId, date: date as string } };
  redirect(`/calendar?date=${date}`);
}

// 달력 옆 칸에서 예정 수업 삭제 (페이지 이동 없음)
export async function removeLesson(lessonId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("lessons")
    .delete({ count: "exact" })
    .eq("id", lessonId);
  return count ? {} : { error: true };
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

export type MoveResult = { ok: true } | { overlaps: Overlap[] } | { error: "move_failed" };

// 달력에서 끌어서 옮기기: 시작 시각만 바꿈 (길이·학생·메모 그대로). 날짜·시각은 옮긴 사람의 시간대 기준
// "예정" 수업만 옮길 수 있음 (처리된 수업은 데이터베이스가 거부)
export async function moveLesson(
  lessonId: string,
  date: string,
  time: string,
  ignoreOverlap = false,
): Promise<MoveResult> {
  if (!isDate(date) || !isTime(time)) return { error: "move_failed" };
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const timeZone = profile.timezone as string;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("duration_minutes, status")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.status !== "scheduled") return { error: "move_failed" };

  const start = fromZoned(date, time, timeZone);
  const end = new Date(start.getTime() + lesson.duration_minutes * 60_000);
  if (!ignoreOverlap) {
    const overlaps = await findOverlaps(supabase, start, end, lessonId, timeZone);
    if (overlaps.length) return { overlaps };
  }

  const { count } = await supabase
    .from("lessons")
    .update({ starts_at: start.toISOString() }, { count: "exact" })
    .eq("id", lessonId);
  if (!count) return { error: "move_failed" };
  return { ok: true };
}

export type MemoResult = { ok: true } | { error: "setup" | "save" | "tooLong" };

// 수업 노트만 저장 (완료·결석된 수업에도 가능, 데이터베이스 함수 0016). 쓴 사람·시각은 자동 기록
export async function saveLessonMemo(lessonId: string, memo: string): Promise<MemoResult> {
  if (memo.length > NOTE_MAX) return { error: "tooLong" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lesson_memo", { p_lesson_id: lessonId, p_memo: memo });
  if (isMissingFunction(error)) return { error: "setup" };
  if (error) return { error: "save" };
  return { ok: true };
}
