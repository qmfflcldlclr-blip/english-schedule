"use server";

// 달력 옆 칸(폰은 아래 창)에 보여 줄 내용을 가져오는 함수들
import { getCurrentProfile } from "@/lib/supabase/server";
import { getLesson, getRemaining, listLessons, type Lesson } from "@/lib/lessons";
import { getStudent } from "@/lib/students";
import { addMonths, isMonth } from "@/lib/print-layout";
import { scheduleDayStart } from "@/lib/time";

export type PanelStudent = {
  student: { id: string; name: string; lesson_minutes: number; archived: boolean };
  remaining: number;
  lessons: Lesson[]; // 그 달(수업일 기준) 수업, 시간순
};

// 학생 한 명의 한 달 수업 + 남은 횟수. month = "YYYY-MM" (내 시간대 기준)
export async function loadStudentMonth(studentId: string, month: string): Promise<PanelStudent | null> {
  if (!isMonth(month)) return null;
  const profile = await getCurrentProfile();
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const student = await getStudent(studentId);
  if (!student) return null;
  const [lessons, remaining] = await Promise.all([
    listLessons(
      scheduleDayStart(`${month}-01`, timeZone),
      scheduleDayStart(`${addMonths(month, 1)}-01`, timeZone),
      studentId,
    ),
    getRemaining(studentId),
  ]);
  return {
    student: { id: student.id, name: student.label, lesson_minutes: student.lesson_minutes, archived: student.archived },
    remaining,
    lessons,
  };
}

// 수업 한 개 (오른쪽 칸 위쪽 카드용)
export async function loadLesson(lessonId: string): Promise<Lesson | null> {
  return getLesson(lessonId);
}
