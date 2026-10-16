// 플랜별 시작·종료 수업 계산 (데이터베이스 없이 순수 계산만)
// 횟수는 "먼저 시작한 플랜부터" 쓰고, 수동 조정(이월·보너스·정정)은 맨 앞에서 먼저 씀 (computePlanProgress 와 같은 순서)
// 잡혀 있는 수업이 모자라면 마지막 한 주의 수업 요일·시각이 계속 반복된다고 보고 예상 날짜를 냄
// 예상할 때는 주말·공휴일(skipDay)은 수업 없다고 봄 → 실제로 그날 수업을 잡으면 그 수업이 세어져서 종료가 당겨짐
import { creditUnits } from "@/config/rules";

export type TimelinePlan = { id: string; credits: number; starts_on: string; created_at: string };
export type TimelineLesson = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  status: string; // scheduled / completed / absent / free_cancel
  charged: number; // 이미 처리된 수업이 실제로 쓴 횟수 (기록 합계를 뒤집은 값)
};
export type PlanSpan = {
  planId: string;
  start: string | null; // 첫 수업 시작 시각 (ISO)
  end: string | null; // 마지막 회차 수업 시작 시각
  startProjected: boolean; // 아직 안 잡힌 수업으로 예상한 날짜
  endProjected: boolean;
};
export type LessonMark = "start" | "end" | "both";

const WEEK_MS = 7 * 86_400_000;
const MAX_PROJECT_WEEKS = 52;

export function planTimeline(
  plans: TimelinePlan[],
  lessons: TimelineLesson[],
  carry: number,
  skipDay: (at: number) => boolean = () => false,
) {
  const ordered = [...plans].sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.created_at.localeCompare(b.created_at));
  // 수업마다 쓰는 횟수: 처리된 수업은 실제 기록, 예정 수업은 길이만큼, 연기는 0
  const real = lessons
    .map((l) => ({ id: l.id, at: Date.parse(l.starts_at), units: l.status === "scheduled" ? creditUnits(l.duration_minutes) : l.charged }))
    .filter((l) => l.units > 0)
    .sort((a, b) => a.at - b.at);

  const marks = new Map<string, LessonMark>();
  const spans: PlanSpan[] = [];
  const total = ordered.reduce((sum, p) => sum + p.credits, 0) + carry;

  // 모자라면 마지막 한 주 수업을 매주 반복해서 이어 붙임 (예상)
  const timeline: { id: string | null; at: number; units: number }[] = [...real];
  const used = real.reduce((sum, l) => sum + l.units, 0);
  if (used < total && real.length) {
    const last = real[real.length - 1].at;
    const week = real.filter((l) => l.at > last - WEEK_MS);
    let sum = used;
    for (let k = 1; k <= MAX_PROJECT_WEEKS && sum < total; k++) {
      for (const l of week) {
        const at = l.at + k * WEEK_MS;
        if (skipDay(at)) continue;
        timeline.push({ id: null, at, units: l.units });
        sum += l.units;
      }
    }
  }

  let from = carry; // 이 플랜 앞에서 이미 쓰인 횟수
  for (const p of ordered) {
    const lo = Math.max(from, 0);
    const hi = from + p.credits;
    from = hi;
    const span: PlanSpan = { planId: p.id, start: null, end: null, startProjected: false, endProjected: false };
    if (hi > 0) {
      let c = 0;
      for (const l of timeline) {
        const prev = c;
        c += l.units;
        if (span.start === null && prev <= lo && c > lo) {
          span.start = new Date(l.at).toISOString();
          span.startProjected = l.id === null;
          if (l.id) marks.set(l.id, "start");
        }
        if (prev < hi && c >= hi) {
          span.end = new Date(l.at).toISOString();
          span.endProjected = l.id === null;
          if (l.id) marks.set(l.id, marks.get(l.id) === "start" ? "both" : "end");
          break;
        }
      }
    }
    spans.push(span);
  }
  return { marks, spans };
}
