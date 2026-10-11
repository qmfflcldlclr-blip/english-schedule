import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/db-errors";
import { getStudentLabels } from "@/lib/student-labels";

export const FEEDBACK_KINDS = ["good", "improve", "note"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const isFeedbackKind = (v: unknown): v is FeedbackKind => FEEDBACK_KINDS.includes(v as FeedbackKind);

export type Feedback = {
  id: string;
  studentId: string;
  studentName: string;
  kind: FeedbackKind;
  content: string;
  createdBy: string;
  authorName: string;
  createdAt: string;
  edited: boolean;
  lessonId: string | null; // 수업 피드백이면 그 수업 (일반 피드백은 null)
  lessonStartsAt: string | null;
};

const BASE_COLUMNS =
  "id, student_id, kind, content, created_by, created_at, updated_at, student:students(name), author:profiles(display_name)";
// 수업 연결(0017) 포함. 0017 실행 전이면 BASE_COLUMNS 로 다시 가져옴
const COLUMNS = `${BASE_COLUMNS}, lesson_id, lesson:lessons(starts_at)`;
const isMissingColumn = (error: { code?: string } | null) =>
  error?.code === "42703" || error?.code === "PGRST200" || error?.code === "PGRST204";

type Row = {
  id: string;
  student_id: string;
  kind: FeedbackKind;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  student: { name: string } | { name: string }[] | null;
  author: { display_name: string } | { display_name: string }[] | null;
  lesson_id?: string | null;
  lesson?: { starts_at: string } | { starts_at: string }[] | null;
};

const first = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? undefined;

function toFeedback(r: Row, labels: Map<string, string>): Feedback {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: labels.get(r.student_id) ?? first(r.student)?.name ?? "",
    kind: r.kind,
    content: r.content,
    createdBy: r.created_by,
    authorName: first(r.author)?.display_name ?? "",
    createdAt: r.created_at,
    // 작성 직후 저장 시각 차이는 무시하고, 1분 넘게 지나 고쳤을 때만 "수정됨"
    edited: new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000,
    lessonId: r.lesson_id ?? null,
    lessonStartsAt: first(r.lesson ?? null)?.starts_at ?? null,
  };
}

// 최신순 피드백. 학생·종류·수업으로 거를 수 있음
export async function listFeedback(
  filter: { studentId?: string; kind?: FeedbackKind; lessonId?: string; limit?: number } = {},
) {
  const supabase = await createClient();
  const run = (columns: string) => {
    let q = supabase.from("student_feedback").select(columns).order("created_at", { ascending: false });
    if (filter.studentId) q = q.eq("student_id", filter.studentId);
    if (filter.kind) q = q.eq("kind", filter.kind);
    if (filter.lessonId) q = q.eq("lesson_id", filter.lessonId);
    return q.limit(filter.limit ?? 200);
  };
  let { data, error } = await run(COLUMNS);
  if (isMissingColumn(error)) {
    if (filter.lessonId) return []; // 수업 연결이 아직 없음
    ({ data, error } = await run(BASE_COLUMNS));
  }
  // 피드백 표가 아직 없으면(SQL 0010 실행 전) 빈 목록 — 학생 화면이 멈추지 않게
  if (isMissingTable(error)) return [];
  if (error) throw error;
  const labels = await getStudentLabels();
  return (data as unknown as Row[]).map((r) => toFeedback(r, labels));
}

export async function getFeedback(id: string) {
  const supabase = await createClient();
  const full = await supabase.from("student_feedback").select(COLUMNS).eq("id", id).maybeSingle();
  // 0017 실행 전이면 수업 연결 없이 다시
  const { data } = isMissingColumn(full.error)
    ? await supabase.from("student_feedback").select(BASE_COLUMNS).eq("id", id).maybeSingle()
    : full;
  return data ? toFeedback(data as unknown as Row, await getStudentLabels()) : null;
}

// 달력 표시용: 이 수업들 중 피드백이 있는 수업 id (0017 실행 전이면 빈 목록)
export async function lessonIdsWithFeedback(lessonIds: string[]): Promise<string[]> {
  if (!lessonIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_feedback").select("lesson_id").in("lesson_id", lessonIds);
  if (error) return [];
  return [...new Set(data.map((r) => r.lesson_id as string))];
}
