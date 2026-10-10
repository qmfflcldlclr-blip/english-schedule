import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStudentLabels } from "@/lib/student-labels";

export type LessonStatus = "scheduled" | "completed" | "free_cancel" | "absent";

export type Lesson = {
  id: string;
  student_id: string;
  starts_at: string;
  duration_minutes: number;
  status: LessonStatus;
  series_id: string | null;
  memo: string | null;
  cancelled_at: string | null; // 있으면 취소(무료·차감), 결석인데 없으면 노쇼
  studentName: string; // 동명이인은 "김민준 #2" 처럼 번호 포함
};

const COLUMNS =
  "id, student_id, starts_at, duration_minutes, status, series_id, memo, cancelled_at, student:students(name)";

type Row = Omit<Lesson, "studentName"> & {
  student: { name: string } | { name: string }[] | null;
};

function toLesson({ student, ...row }: Row, labels: Map<string, string>): Lesson {
  const s = Array.isArray(student) ? student[0] : student;
  return { ...row, studentName: labels.get(row.student_id) ?? s?.name ?? "" };
}

// from 이상 to 미만에 시작하는 수업 (시간순)
export async function listLessons(from: Date, to: Date): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at");
  if (error) throw error;
  const labels = await getStudentLabels();
  return (data as Row[]).map((r) => toLesson(r, labels));
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? toLesson(data as Row, await getStudentLabels()) : null;
}

// 상대방(나와 다른 시간대의 매니저·선생님) 시간대. 없으면 null
export async function getOtherTimeZone(myId: string, myTimeZone: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .neq("id", myId)
    .in("role", ["manager", "teacher"]);
  return data?.map((p) => p.timezone as string).find((tz) => tz !== myTimeZone) ?? null;
}

// 학생의 남은 횟수
export async function getRemaining(studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_balances")
    .select("remaining")
    .eq("student_id", studentId)
    .maybeSingle();
  return (data?.remaining as number | undefined) ?? 0;
}
