"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOTE_MAX } from "@/config/rules";
import { isMissingFunction, isMissingTable } from "@/lib/db-errors";

export type NoteFormState = { saved?: boolean; error?: "tooLong" | "save" | "setup" };

// 내 메모 저장 (상대방 메모는 데이터베이스 보안 규칙이 막음)
export async function saveNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const content = String(formData.get("content") ?? "").trimEnd();
  if (content.length > NOTE_MAX) return { error: "tooLong" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return { error: "save" };

  const { count, error } = await supabase
    .from("staff_notes")
    .update({ content }, { count: "exact" })
    .eq("owner_id", me);
  if (isMissingTable(error)) return { error: "setup" };
  if (error) return { error: "save" };
  if (!count) {
    // 메모 칸이 아직 없으면(새 직원) 새로 만듦
    const { error: insertError } = await supabase.from("staff_notes").insert({ owner_id: me, content });
    if (insertError) return { error: "save" };
  }
  revalidatePath("/");
  return { saved: true };
}

// 학생 노트 저장: visibility = "private"(나만 보기) / "shared"(함께 보기). 규칙은 데이터베이스 함수(0014)가 지킴
export async function saveStudentNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const studentId = String(formData.get("student_id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  const content = String(formData.get("content") ?? "").trimEnd();
  if (content.length > NOTE_MAX) return { error: "tooLong" };
  if (!studentId || (visibility !== "private" && visibility !== "shared")) return { error: "save" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_student_note", {
    p_student_id: studentId,
    p_visibility: visibility,
    p_content: content,
  });
  if (isMissingFunction(error)) return { error: "setup" };
  if (error) return { error: "save" };
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students"); // 학생 목록의 노트 칸도
  return { saved: true };
}
