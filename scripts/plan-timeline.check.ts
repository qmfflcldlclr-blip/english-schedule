// 시작·종료 계산 자체 점검: npx tsx scripts/plan-timeline.check.ts ("OK" 가 나오면 성공)
import assert from "node:assert/strict";
import { planTimeline } from "../src/lib/plan-timeline";

const at = (d: number) => new Date(Date.UTC(2026, 9, d, 9)).toISOString();
const lesson = (id: string, d: number, status = "scheduled", minutes = 30, charged = 0) =>
  ({ id, starts_at: at(d), duration_minutes: minutes, status, charged });
const plan = (id: string, credits: number, starts_on: string) => ({ id, credits, starts_on, created_at: starts_on });

// 주 2회(화·목) 4회 플랜: 1번째 시작, 4번째 종료, 연기는 세지 않음
{
  const { marks, spans } = planTimeline(
    [plan("p1", 4, "2026-10-01")],
    [lesson("a", 6, "completed", 30, 1), lesson("b", 8, "free_cancel"), lesson("c", 13), lesson("d", 15), lesson("e", 20)],
    0,
  );
  assert.equal(marks.get("a"), "start");
  assert.equal(marks.get("e"), "end");
  assert.equal(spans[0].endProjected, false);
}
// 이월 1회가 먼저 쓰이고, 두 번째 플랜은 다음 수업부터. 수업이 모자라면 매주 반복으로 예상
{
  const { marks, spans } = planTimeline(
    [plan("p1", 2, "2026-10-01"), plan("p2", 4, "2026-10-10")],
    [lesson("a", 6), lesson("b", 8), lesson("c", 13), lesson("d", 15)],
    1,
  );
  assert.equal(marks.get("a"), undefined); // 이월분
  assert.equal(marks.get("b"), "start");
  assert.equal(marks.get("c"), "end");
  assert.equal(marks.get("d"), "start");
  assert.equal(spans[1].endProjected, true);
  assert.equal(spans[1].end, at(27)); // d(15일) 다음: 20, 22, 27
}
// 60분 수업(2회) 주 1번에 8회 플랜 → 4번째 주 수업이 종료
{
  const { marks } = planTimeline([plan("p1", 8, "2026-10-01")], [1, 8, 15, 22].map((d) => lesson(`w${d}`, d, "scheduled", 60)), 0);
  assert.equal(marks.get("w1"), "start");
  assert.equal(marks.get("w22"), "end");
}
// 예상 날짜는 공휴일을 건너뜀: 20일이 공휴일이면 종료가 22 → 27일로 밀림. 실제로 20일 수업을 잡으면 다시 당겨짐
{
  const holiday = Date.parse(at(20));
  const { spans } = planTimeline([plan("p1", 4, "2026-10-01")], [lesson("a", 13), lesson("b", 15)], 0, (t) => t === holiday);
  assert.equal(spans[0].end, at(27));
  const booked = planTimeline([plan("p1", 4, "2026-10-01")], [lesson("a", 13), lesson("b", 15), lesson("c", 20)], 0, (t) => t === holiday);
  assert.equal(booked.spans[0].end, at(22));
  assert.equal(booked.spans[0].endProjected, true);
}
console.log("OK");
