import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StaffNote = {
  ownerId: string;
  name: string;
  role: "manager" | "teacher";
  content: string;
  updatedAt: string | null; // 메모가 비어 있으면 null
};

// 홈 메모 칸: 매니저 먼저, 그다음 선생님
export async function getStaffNotes(): Promise<StaffNote[]> {
  const supabase = await createClient();
  const [profilesRes, notesRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role").in("role", ["manager", "teacher"]),
    supabase.from("staff_notes").select("owner_id, content, updated_at"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  // 메모 표가 아직 없으면(SQL 0009 실행 전) 빈 메모로 표시
  const notes = new Map((notesRes.data ?? []).map((n) => [n.owner_id as string, n]));

  return profilesRes.data
    .map((p) => {
      const n = notes.get(p.id);
      const content = (n?.content as string | undefined) ?? "";
      return {
        ownerId: p.id as string,
        name: p.display_name as string,
        role: p.role as StaffNote["role"],
        content,
        updatedAt: content ? (n!.updated_at as string) : null, // 비어 있으면 수정 시각도 숨김
      };
    })
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "manager" ? -1 : 1));
}
