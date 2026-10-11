import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStudentLabels } from "@/lib/student-labels";

export type Student = {
  id: string;
  name: string;
  name_en?: string | null; // 영어 이름 (비면 영어 화면에서 자동 로마자). 0013 실행 전에는 없음
  lesson_minutes: number;
  memo: string | null;
  archived: boolean;
  created_at: string;
  label: string; // 화면 표시 이름 (동명이인은 "김민준 #2")
};

// "*": 영어 이름 칸(0013)을 아직 안 만들었어도 깨지지 않게
const COLUMNS = "*";

// 학생 목록 (이름순). archived=true 면 보관된 학생만
export async function listStudents(archived: boolean): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(COLUMNS)
    .eq("archived", archived)
    .order("name");
  if (error) throw error;
  const labels = await getStudentLabels();
  return data.map((s) => ({ ...s, label: labels.get(s.id) ?? s.name }));
}

export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { ...data, label: (await getStudentLabels()).get(data.id) ?? data.name };
}

// 남은 횟수가 max 이하인 학생 (보관 안 된 학생만, 적게 남은 순)
export async function listLowCreditStudents(max: number) {
  const supabase = await createClient();
  const [{ data: balances }, students] = await Promise.all([
    supabase.from("student_balances").select("student_id, remaining").lte("remaining", max),
    listStudents(false),
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));
  return (balances ?? [])
    .filter((b) => byId.has(b.student_id))
    .map((b) => ({ id: b.student_id as string, name: byId.get(b.student_id)!.label, remaining: b.remaining as number }))
    .sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name));
}
