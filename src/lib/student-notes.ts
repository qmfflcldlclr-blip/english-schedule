import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/db-errors";

export type StudentNote = {
  content: string;
  updatedAt: string | null; // 비어 있으면 null
  updatedByName: string | null; // 공유용: 마지막으로 고친 사람
};

// 학생 상세의 노트 2칸. 개별용은 데이터베이스 보안 규칙상 내 것만 옴. 표가 없으면(0014 실행 전) null
export async function getStudentNotes(studentId: string) {
  const supabase = await createClient();
  const [{ data, error }, { data: profiles }] = await Promise.all([
    supabase.from("student_notes").select("visibility, content, updated_at, updated_by").eq("student_id", studentId),
    supabase.from("profiles").select("id, display_name"),
  ]);
  if (isMissingTable(error)) return null;
  if (error) throw error;
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));
  const pick = (visibility: "private" | "shared"): StudentNote => {
    const row = data.find((r) => r.visibility === visibility);
    const content = (row?.content as string | undefined) ?? "";
    return {
      content,
      updatedAt: content ? (row!.updated_at as string) : null,
      updatedByName: content ? (names.get(row!.updated_by as string) ?? null) : null,
    };
  };
  return { private: pick("private"), shared: pick("shared") };
}

// 학생 목록용: 학생마다 내 개별용·공유용 노트 내용 (표가 없으면 빈 목록)
export async function listNotesByStudent() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_notes").select("student_id, visibility, content");
  const map = new Map<string, { privateNote: string; sharedNote: string }>();
  if (error) return map; // 0014 실행 전
  for (const r of data) {
    const entry = map.get(r.student_id as string) ?? { privateNote: "", sharedNote: "" };
    if (r.visibility === "private") entry.privateNote = r.content as string;
    else entry.sharedNote = r.content as string;
    map.set(r.student_id as string, entry);
  }
  return map;
}
