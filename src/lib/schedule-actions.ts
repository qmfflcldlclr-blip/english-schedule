"use server";

import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { REPEAT_MAX_WEEKS, isLessonLength } from "@/config/rules";
import { isDate, isTime, toZoned, weekStart } from "@/lib/time";
import { planCopyWeek, planRepeat, type RepeatItem } from "@/lib/schedule";

async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return { id: profile.id as string, timeZone: profile.timezone as string };
}

// 고른 주(source)의 수업을 지금 보는 주(weekFirst)로 복사
// 이미 있는 건 건너뜀(두 번 눌러도 중복 없음), 넣을 날이 한국 공휴일이면 건너뜀
export async function copyWeek(formData: FormData) {
  const weekFirst = formData.get("weekFirst");
  const source = formData.get("source");
  if (!isDate(weekFirst) || !isDate(source)) redirect("/calendar");
  const me = await requireProfile();

  const rows = (await planCopyWeek(weekStart(weekFirst), weekStart(source), me.timeZone))
    .filter((item) => !item.duplicate && !item.holiday)
    .map((item) => ({
      student_id: item.studentId,
      starts_at: item.startsAt,
      duration_minutes: item.duration,
      created_by: me.id,
    }));
  if (rows.length) {
    const supabase = await createClient();
    const { error } = await supabase.from("lessons").insert(rows);
    if (error) throw error;
  }
  redirect(`/calendar?date=${weekFirst}`);
}

export type RepeatFormState = {
  errors?: {
    student?: boolean;
    weekdays?: boolean;
    date?: boolean;
    time?: boolean;
    weeks?: boolean;
    duration?: boolean;
    save?: boolean;
  };
  preview?: RepeatItem[];
};

// 반복 생성: mode=preview 면 목록만 계산, mode=create 면 실제로 생성
export async function repeatLessons(
  _prev: RepeatFormState,
  formData: FormData,
): Promise<RepeatFormState> {
  const studentId = String(formData.get("student_id") ?? "");
  const weekdays = formData.getAll("weekday").map(Number).filter((n) => n >= 0 && n <= 6);
  const startDate = formData.get("start_date");
  const time = formData.get("time");
  const weeks = Number(formData.get("weeks"));
  const duration = Number(formData.get("duration_minutes"));

  const errors: NonNullable<RepeatFormState["errors"]> = {};
  if (!studentId) errors.student = true;
  if (weekdays.length === 0) errors.weekdays = true;
  if (!isDate(startDate)) errors.date = true;
  if (!isTime(time)) errors.time = true;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > REPEAT_MAX_WEEKS) errors.weeks = true;
  if (!isLessonLength(duration)) errors.duration = true;
  if (Object.keys(errors).length) return { errors };

  const me = await requireProfile();
  const preview = await planRepeat({
    studentId,
    startDate: startDate as string,
    weekdays,
    time: time as string,
    weeks,
    duration,
    timeZone: me.timeZone,
  });

  if (formData.get("mode") !== "create") return { preview };

  const seriesId = crypto.randomUUID();
  const rows = preview
    .filter((p) => !p.duplicate)
    .map((p) => ({
      student_id: studentId,
      starts_at: p.startsAt,
      duration_minutes: duration,
      series_id: seriesId,
      created_by: me.id,
    }));
  if (rows.length) {
    const supabase = await createClient();
    const { error } = await supabase.from("lessons").insert(rows);
    if (error) return { preview, errors: { save: true } };
  }
  redirect(`/calendar?date=${startDate}`);
}

// 이 수업 + 같은 반복의 이후 "예정" 수업 모두 삭제
export async function deleteSeriesFrom(lessonId: string) {
  const supabase = await createClient();
  const me = await requireProfile();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("series_id, starts_at")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson?.series_id) return { error: true };

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("series_id", lesson.series_id)
    .eq("status", "scheduled")
    .gte("starts_at", lesson.starts_at);
  if (error) return { error: true };
  redirect(`/calendar?date=${toZoned(lesson.starts_at, me.timeZone).date}`);
}
