"use server";

// 달력 옆 칸(폰은 아래 창)에 보여 줄 내용을 가져오는 함수들
import { getCurrentProfile } from "@/lib/supabase/server";
import { getLesson, getMemoMeta, getRemaining, listLessons, type Lesson } from "@/lib/lessons";
import { getLocale } from "@/i18n/server";
import { translateMany, translateNote } from "@/lib/translate";
import { listFeedback, type Feedback } from "@/lib/feedback";
import { createClient } from "@/lib/supabase/server";
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

export type PanelLesson = Lesson & {
  memoMeta: { at: string; by: string } | null; // 노트를 마지막으로 쓴 시각·사람
};

// 수업 한 개 (오른쪽 칸 위쪽 카드용) + 노트 번역·쓴 사람
export async function loadLesson(lessonId: string): Promise<PanelLesson | null> {
  const [lesson, memoMeta, locale] = await Promise.all([getLesson(lessonId), getMemoMeta(lessonId), getLocale()]);
  if (!lesson) return null;
  const t = lesson.memo ? await translateNote(lesson.memo, locale) : null;
  return { ...lesson, memoT: t && "text" in t ? t.text : null, memoMeta };
}

export type PanelFeedback = Feedback & { translated: string | null };

// 수업 한 개의 피드백 (최신순) + 화면 언어 번역 + 내 id (내 것만 지우기 버튼)
export async function loadLessonFeedback(lessonId: string) {
  const supabase = await createClient();
  const [items, locale, { data: claims }] = await Promise.all([
    listFeedback({ lessonId }),
    getLocale(),
    supabase.auth.getClaims(),
  ]);
  const translated = await translateMany(items.map((f) => f.content), locale);
  return {
    me: (claims?.claims?.sub as string | undefined) ?? "",
    items: items.map((f, i): PanelFeedback => ({ ...f, translated: translated[i] })),
  };
}
