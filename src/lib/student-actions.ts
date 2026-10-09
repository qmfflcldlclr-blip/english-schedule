"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const values = { name, lesson_minutes: minutes, memo };

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
