import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/db-errors";

export type StudentNote = {
  content: string;
  updatedAt: string | null; // 비어 있으면 null
  updatedByName: string | null; // 공유용: 마지막으로 고친 사람
};

// 지금 로그인한 사람 id
async function myId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? "";
}

// 공유용 + 내 개별용만 가져오는 조건. 데이터베이스 보안 규칙(0014)도 똑같이 막지만, 코드에서도 한 번 더 걸러 냄
const mineOrShared = (me: string) => `visibility.eq.shared,owner_id.eq.${me}`;

// 학생 상세의 노트 2칸. 표가 없으면(0014 실행 전) null
export async function getStudentNotes(studentId: string) {
  const supabase = await createClient();
  const me = await myId(supabase);
  const [{ data, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("student_notes")
      .select("visibility, owner_id, content, updated_at, updated_by")
      .eq("student_id", studentId)
      .or(mineOrShared(me)),
    supabase.from("profiles").select("id, display_name"),
  ]);
  if (isMissingTable(error)) return null;
  if (error) throw error;
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));
  const pick = (visibility: "private" | "shared"): StudentNote => {
    const row = data.find((r) => r.visibility === visibility && (visibility === "shared" || r.owner_id === me));
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
  const me = await myId(supabase);
  const { data, error } = await supabase
    .from("student_notes")
    .select("student_id, visibility, owner_id, content")
    .or(mineOrShared(me));
  const map = new Map<string, { privateNote: string; sharedNote: string }>();
  if (error) return map; // 0014 실행 전
  for (const r of data) {
    const entry = map.get(r.student_id as string) ?? { privateNote: "", sharedNote: "" };
    if (r.visibility === "shared") entry.sharedNote = r.content as string;
    else if (r.owner_id === me) entry.privateNote = r.content as string;
    map.set(r.student_id as string, entry);
  }
  return map;
}
