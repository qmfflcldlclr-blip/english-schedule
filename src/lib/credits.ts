import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  computePlanProgress,
  withRunningBalance,
  type PlanRow,
} from "@/lib/credit-math";

export type EntryKind =
  | "plan"
  | "lesson_completed"
  | "absent"
  | "late_cancel"
  | "free_cancel"
  | "adjust";

const PLAN_COLUMNS =
  "id, student_id, credits, paid_on, starts_on, expires_on, memo, created_at";

// 학생 1명의 횟수 현황: 요약 + 플랜별 진행 + 기록(최신순)
export async function getStudentCredits(studentId: string, today: string) {
  const supabase = await createClient();
  const [plansRes, entriesRes] = await Promise.all([
    supabase.from("plans").select(PLAN_COLUMNS).eq("student_id", studentId),
    supabase
      .from("credit_entries")
      .select(
        "id, delta, kind, plan_id, reason, created_at, creator:profiles(display_name)",
      )
      .eq("student_id", studentId)
      .order("created_at"),
  ]);
  if (plansRes.error) throw plansRes.error;
  if (entriesRes.error) throw entriesRes.error;

  const entries = entriesRes.data.map((e) => ({
    id: e.id as string,
    delta: e.delta as number,
    kind: e.kind as EntryKind,
    plan_id: e.plan_id as string | null,
    reason: e.reason as string | null,
    created_at: e.created_at as string,
    creatorName: firstOf(e.creator)?.display_name ?? "",
  }));

  const remaining = entries.reduce((sum, e) => sum + e.delta, 0);
  const used = -entries
    .filter((e) => e.kind !== "plan")
    .reduce((sum, e) => sum + e.delta, 0);
  const plans = computePlanProgress(plansRes.data as PlanRow[], used, today);

  return {
    remaining,
    used,
    purchased: plans.reduce((sum, p) => sum + p.credits, 0),
    firstStart: plans[0]?.starts_on ?? null,
    plans,
    entries: withRunningBalance(entries).reverse(),
  };
}

export async function getPlan(planId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("id", planId)
    .maybeSingle();
  return data as (PlanRow & { student_id: string }) | null;
}

// 학생 목록용: 학생별 남은 횟수와 "기간 지난 플랜이 있는지"
export async function getCreditOverview(studentIds: string[], today: string) {
  const overview = new Map<string, { remaining: number; expired: boolean }>();
  if (studentIds.length === 0) return overview;

  const supabase = await createClient();
  const [balancesRes, plansRes] = await Promise.all([
    supabase
      .from("student_balances")
      .select("student_id, remaining, used")
      .in("student_id", studentIds),
    supabase.from("plans").select(PLAN_COLUMNS).in("student_id", studentIds),
  ]);
  if (balancesRes.error) throw balancesRes.error;
  if (plansRes.error) throw plansRes.error;

  for (const b of balancesRes.data) {
    const plans = (plansRes.data as (PlanRow & { student_id: string })[]).filter(
      (p) => p.student_id === b.student_id,
    );
    const progress = computePlanProgress(plans, b.used, today);
    overview.set(b.student_id, {
      remaining: b.remaining,
      expired: progress.some((p) => p.expired),
    });
  }
  return overview;
}

// Supabase 가 연결된 표를 객체 또는 배열로 돌려줄 수 있어 둘 다 처리
function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
