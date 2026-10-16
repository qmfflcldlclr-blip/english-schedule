// 플랜 종류 고르기 (주 1~5회 + 1회 테스트). 예전 특이 플랜(예: 5회)을 수정할 때는 그 횟수도 목록에 남김
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { PLAN_OPTIONS } from "@/config/rules";

type T = Pick<Messages["credits"], "planType" | "planTest" | "planCustom">;

// "주 2회 · 8회" / "1회 (테스트)" / "5회 (예전 플랜)"
export function planLabel(credits: number, t: T) {
  const o = PLAN_OPTIONS.find((p) => p.credits === credits);
  if (!o) return format(t.planCustom, { n: credits });
  return o.perWeek ? format(t.planType, { w: o.perWeek, n: credits }) : t.planTest;
}

export default function PlanSelect({ t, current, className, invalid }: { t: T; current?: number; className: string; invalid?: boolean }) {
  const extra = current !== undefined && !PLAN_OPTIONS.some((p) => p.credits === current) ? [current] : [];
  return (
    <select name="credits" required defaultValue={current ?? PLAN_OPTIONS[1].credits} aria-invalid={invalid || undefined} className={className}>
      {[...PLAN_OPTIONS.map((p) => p.credits), ...extra].map((n) => (
        <option key={n} value={n}>
          {planLabel(n, t)}
        </option>
      ))}
    </select>
  );
}
