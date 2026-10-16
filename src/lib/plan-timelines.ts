import "server-only";
import { createClient } from "@/lib/supabase/server";
import { planTimeline, type TimelineLesson, type TimelinePlan } from "@/lib/plan-timeline";
import { getHolidays } from "@/lib/holidays";
import { addDays, toScheduleDay } from "@/lib/time";

const KR_TIME_ZONE = "Asia/Seoul";
const PROJECT_DAYS = 400; // 예상 날짜를 계산하는 최대 범위 (plan-timeline 의 52주보다 넉넉히)

const PAGE = 1000; // Supabase 가 한 번에 돌려주는 최대 줄 수

type Query = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> };

// 1000줄이 넘어도 끝까지 읽기
async function fetchAll<T>(query: () => Query): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

// 시작·종료 날짜 글자 "10/27", 예상이면 "10/27 (예상)", 없으면 "미정" (보는 사람 시간대, 새벽 수업은 전날)
export function spanDay(iso: string | null | undefined, projected: boolean | undefined, timeZone: string, t: { projected: string; undecided: string }) {
  if (!iso) return t.undecided;
  const d = toScheduleDay(iso, timeZone).date;
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8))}${projected ? ` ${t.projected}` : ""}`;
}

// 학생별 플랜 시작·종료 (수업 칸 표시 + 플랜별 날짜)
export async function getPlanTimelines(studentIds: string[]) {
  const result = new Map<string, ReturnType<typeof planTimeline>>();
  if (studentIds.length === 0) return result;
  const supabase = await createClient();
  const today = toScheduleDay(new Date(), KR_TIME_ZONE).date;
  const [plans, entries, lessons, holidays] = await Promise.all([
    fetchAll<TimelinePlan & { student_id: string }>(() =>
      supabase.from("plans").select("id, student_id, credits, starts_on, created_at").in("student_id", studentIds).order("id"),
    ),
    fetchAll<{ student_id: string; delta: number; kind: string; lesson_id: string | null }>(() =>
      supabase.from("credit_entries").select("student_id, delta, kind, lesson_id").in("student_id", studentIds).order("id"),
    ),
    fetchAll<Omit<TimelineLesson, "charged"> & { student_id: string }>(() =>
      supabase.from("lessons").select("id, student_id, starts_at, duration_minutes, status").in("student_id", studentIds).order("id"),
    ),
    getHolidays(addDays(today, -7), addDays(today, PROJECT_DAYS)),
  ]);

  // 예상에서 빼는 날: 토·일 + 한국 공휴일 (한국 날짜 기준, 새벽 수업은 전날)
  const skipDay = (at: number) => {
    const day = toScheduleDay(new Date(at), KR_TIME_ZONE).date;
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    return weekday === 0 || weekday === 6 || Boolean(holidays[day]?.some((h) => h.country === "KR"));
  };

  // 수업별 실제로 쓴 횟수, 학생별 수업과 무관한 조정 합계(이월·보너스·정정)
  const charged = new Map<string, number>();
  const carry = new Map<string, number>();
  for (const e of entries) {
    const delta = Number(e.delta);
    if (e.lesson_id) charged.set(e.lesson_id, (charged.get(e.lesson_id) ?? 0) - delta);
    else if (e.kind !== "plan") carry.set(e.student_id, (carry.get(e.student_id) ?? 0) + delta);
  }

  for (const id of studentIds) {
    result.set(
      id,
      planTimeline(
        plans.filter((p) => p.student_id === id).map((p) => ({ ...p, credits: Number(p.credits) })),
        lessons.filter((l) => l.student_id === id).map((l) => ({ ...l, charged: charged.get(l.id) ?? 0 })),
        carry.get(id) ?? 0,
        skipDay,
      ),
    );
  }
  return result;
}
