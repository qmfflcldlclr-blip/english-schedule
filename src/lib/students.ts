import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStudentLabels } from "@/lib/student-labels";

export type Student = {
  id: string;
  name: string;
  lesson_minutes: number;
  memo: string | null;
  archived: boolean;
  created_at: string;
  label: string; // 화면 표시 이름 (동명이인은 "김민준 #2")
};

const COLUMNS = "id, name, lesson_minutes, memo, archived, created_at";

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
