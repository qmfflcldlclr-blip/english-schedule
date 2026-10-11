"use server";

// 학생 목록 옆 칸(폰은 아래 창)에 보여 줄 학생 한 명의 내용: 횟수·플랜·기록 + 노트
import { getCurrentProfile } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { getStudent } from "@/lib/students";
import { getStudentCredits } from "@/lib/credits";
import { getStudentNotes } from "@/lib/student-notes";
import { translateNote } from "@/lib/translate";
import { todayIn } from "@/lib/credit-math";

export async function loadStudentPanel(studentId: string) {
  const [profile, locale, student] = await Promise.all([getCurrentProfile(), getLocale(), getStudent(studentId)]);
  if (!student) return null;
  const today = todayIn((profile?.timezone as string) ?? "UTC");
  const [credits, notes] = await Promise.all([getStudentCredits(studentId, today), getStudentNotes(studentId)]);
  const sharedTranslation = notes ? await translateNote(notes.shared.content, locale) : null;
  return {
    student: { id: student.id, label: student.label, name: student.name, archived: student.archived },
    today,
    credits,
    notes,
    sharedTranslation,
  };
}

export type StudentPanelData = NonNullable<Awaited<ReturnType<typeof loadStudentPanel>>>;
