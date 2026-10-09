import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Student = {
  id: string;
  name: string;
  lesson_minutes: number;
  memo: string | null;
  archived: boolean;
  created_at: string;
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
  return data;
}

export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data;
}
