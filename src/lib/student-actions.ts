"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingFunction } from "@/lib/db-errors";
import { LESSON_MINUTES_MAX, LESSON_MINUTES_MIN } from "@/config/rules";

export type StudentFormState = {
  errors?: { name?: boolean; minutes?: boolean; save?: boolean };
};

// 학생 추가·수정 저장. 폼에 id 가 있으면 수정, 없으면 새로 추가
export async function saveStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const minutes = Number(formData.get("lesson_minutes"));
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const nameEn = String(formData.get("name_en") ?? "").trim() || null;

  const errors: NonNullable<StudentFormState["errors"]> = {};
  if (!name) errors.name = true;
  if (
    !Number.isInteger(minutes) ||
    minutes < LESSON_MINUTES_MIN ||
    minutes > LESSON_MINUTES_MAX
  ) {
    errors.minutes = true;
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const values = { name, name_en: nameEn, lesson_minutes: minutes, memo };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("students").update(values).eq("id", id);
    if (error) return { errors: { save: true } };
  } else {
    const { data, error } = await supabase
      .from("students")
      .insert(values)
      .select("id")
      .single();
    if (error || !data) return { errors: { save: true } };
    savedId = data.id;
  }

  redirect(`/students/${savedId}`);
}

// 보관하기 / 보관 해제
export async function setStudentArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase.from("students").update({ archived }).eq("id", id);
  redirect(archived ? "/students" : `/students/${id}`);
}

export type BulkResult = { count: number } | { error: "invalid" | "save" | "setup" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validIds = (ids: unknown): ids is string[] =>
  Array.isArray(ids) && ids.length > 0 && ids.length <= 500 && ids.every((id) => typeof id === "string" && UUID.test(id));

// 여러 학생 한 번에 보관 / 보관 해제 (기록은 그대로)
export async function archiveStudents(ids: string[], archived: boolean): Promise<BulkResult> {
  if (!validIds(ids)) return { error: "invalid" };
  const supabase = await createClient();
  const { count, error } = await supabase.from("students").update({ archived }, { count: "exact" }).in("id", ids);
  if (error) return { error: "save" };
  revalidatePath("/students");
  return { count: count ?? 0 };
}

// 여러 학생과 그 학생들의 모든 기록을 영구 삭제 (데이터베이스 함수가 한 번에 처리 — SQL 0011)
export async function deleteStudentsPermanently(ids: string[]): Promise<BulkResult> {
  if (!validIds(ids)) return { error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_students_permanently", { p_ids: ids });
  if (isMissingFunction(error)) return { error: "setup" };
  if (error) return { error: "save" };
  revalidatePath("/students");
  revalidatePath("/calendar");
  revalidatePath("/");
  return { count: (data as number) ?? 0 };
}
