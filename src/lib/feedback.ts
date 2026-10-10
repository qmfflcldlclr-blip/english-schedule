import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/db-errors";

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
};

const COLUMNS =
  "id, student_id, kind, content, created_by, created_at, updated_at, student:students(name), author:profiles(display_name)";

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
};

const first = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? undefined;

function toFeedback(r: Row): Feedback {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: first(r.student)?.name ?? "",
    kind: r.kind,
    content: r.content,
    createdBy: r.created_by,
    authorName: first(r.author)?.display_name ?? "",
    createdAt: r.created_at,
    // 작성 직후 저장 시각 차이는 무시하고, 1분 넘게 지나 고쳤을 때만 "수정됨"
    edited: new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000,
  };
}

// 최신순 피드백. 학생·종류로 거를 수 있음
export async function listFeedback(filter: { studentId?: string; kind?: FeedbackKind; limit?: number } = {}) {
  const supabase = await createClient();
  let q = supabase.from("student_feedback").select(COLUMNS).order("created_at", { ascending: false });
  if (filter.studentId) q = q.eq("student_id", filter.studentId);
  if (filter.kind) q = q.eq("kind", filter.kind);
  const { data, error } = await q.limit(filter.limit ?? 200);
  // 피드백 표가 아직 없으면(SQL 0010 실행 전) 빈 목록 — 학생 화면이 멈추지 않게
  if (isMissingTable(error)) return [];
  if (error) throw error;
  return (data as Row[]).map(toFeedback);
}

export async function getFeedback(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("student_feedback").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toFeedback(data as Row) : null;
}
