// 횟수 계산 (데이터베이스 없이 순수 계산만 → 테스트하기 쉬움)

export type PlanRow = {
  id: string;
  credits: number;
  paid_on: string;
  starts_on: string;
  expires_on: string | null;
  memo: string | null;
  created_at: string;
};

export type PlanStatus = "done" | "active" | "waiting";

export type PlanProgress = PlanRow & {
  number: number; // 몇 번째 플랜인지 (1부터)
  used: number;
  left: number;
  status: PlanStatus;
  expired: boolean; // 만료일이 지났는데 횟수가 남아 있음
};

// 사용한 횟수를 "먼저 시작한 플랜부터" 채워 넣어 플랜별 진행 상황을 계산
// used: 플랜 등록을 제외한 모든 증감의 합을 뒤집은 값 (보너스·정정이 있으면 그만큼 줄어듦)
// today: 사용자 시간대 기준 오늘 날짜 "YYYY-MM-DD"
export function computePlanProgress(
  plans: PlanRow[],
  used: number,
  today: string,
): PlanProgress[] {
  const ordered = [...plans].sort(
    (a, b) =>
      a.starts_on.localeCompare(b.starts_on) ||
      a.created_at.localeCompare(b.created_at),
  );

  let toAllocate = Math.max(used, 0);
  let activeFound = false;

  return ordered.map((plan, i) => {
    const planUsed = Math.min(plan.credits, toAllocate);
    toAllocate -= planUsed;
    const left = plan.credits - planUsed;

    let status: PlanStatus = "done";
    if (left > 0) {
      status = activeFound ? "waiting" : "active";
      activeFound = true;
    }

    return {
      ...plan,
      number: i + 1,
      used: planUsed,
      left,
      status,
      expired: left > 0 && plan.expires_on !== null && plan.expires_on < today,
    };
  });
}

// 기록을 오래된 순으로 더해 가며 각 줄 시점의 남은 횟수를 붙임
export function withRunningBalance<T extends { delta: number }>(
  entries: T[],
): (T & { balance: number })[] {
  let balance = 0;
  return entries.map((e) => {
    balance += e.delta;
    return { ...e, balance };
  });
}

// 특정 시간대의 오늘 날짜 "YYYY-MM-DD"
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}
