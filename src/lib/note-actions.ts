"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOTE_MAX } from "@/config/rules";
import { isMissingTable } from "@/lib/db-errors";

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
