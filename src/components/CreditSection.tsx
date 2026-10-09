import Link from "next/link";
import { format, formatDate } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { getStudentCredits } from "@/lib/credits";

type Props = {
  t: Messages["credits"];
  studentId: string;
  archived: boolean;
  credits: Awaited<ReturnType<typeof getStudentCredits>>;
  locale: string;
  timeZone: string;
};

// "YYYY-MM-DD" 날짜는 시간대 변환 없이 그대로 표시
function day(value: string, locale: string) {
  return formatDate(`${value}T00:00:00Z`, locale, "UTC");
}

function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}

const statusStyle = {
  done: "bg-gray-100 text-gray-500",
  active: "bg-emerald-50 text-emerald-700",
  waiting: "bg-sky-50 text-sky-700",
};

// 학생 상세 화면의 수강 횟수 영역: 요약 → 플랜별 진행 → 기록
export default function CreditSection({
  t,
  studentId,
  archived,
  credits,
  locale,
  timeZone,
}: Props) {
  const { remaining, used, purchased, firstStart, plans, entries } = credits;

  return (
    <>
      {/* 요약 */}
      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-500">{t.remaining}</h2>
        <p
          className={`mt-1 text-4xl font-bold tabular-nums ${remaining <= 0 ? "text-red-600" : ""}`}
        >
          {format(t.timesUnit, { n: remaining })}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          {t.purchased} {format(t.timesUnit, { n: purchased })} · {t.used}{" "}
          {format(t.timesUnit, { n: Math.max(used, 0) })}
          {firstStart && (
            <>
              {" "}
              · {t.firstStart} {day(firstStart, locale)}
            </>
          )}
        </p>
        {!archived && (
          <div className="mt-4 flex gap-3">
            <Link
              href={`/students/${studentId}/plans/new`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white"
            >
              + {t.addPlan}
            </Link>
            <Link
              href={`/students/${studentId}/adjust`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium"
            >
              ± {t.adjust}
            </Link>
          </div>
        )}
      </section>

      {/* 플랜별 진행 */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t.plansTitle}</h2>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t.noPlans}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {plans.map((p) => (
              <li key={p.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {format(t.planNumber, { n: p.number })}
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        {format(t.planUsed, { used: p.used, credits: p.credits })}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[p.status]}`}>
                        {t.status[p.status]}
                      </span>
                      {p.expired && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {t.expired}
                        </span>
                      )}
                    </div>
                  </div>
                  {!archived && (
                    <Link
                      href={`/students/${studentId}/plans/${p.id}/edit`}
                      className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      {t.editPlan}
                    </Link>
                  )}
                </div>

                {/* 진행 막대 */}
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={p.credits}
                  aria-valuenow={p.used}
                >
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${(p.used / p.credits) * 100}%` }}
                  />
                </div>

                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-gray-500">{t.paidOn}</dt>
                  <dd>{day(p.paid_on, locale)}</dd>
                  <dt className="text-gray-500">{t.startsOn}</dt>
                  <dd>{day(p.starts_on, locale)}</dd>
                  <dt className="text-gray-500">{t.expiresOn}</dt>
                  <dd className={p.expired ? "font-medium text-red-700" : ""}>
                    {p.expires_on ? day(p.expires_on, locale) : t.noExpiry}
                  </dd>
                  {p.memo && (
                    <>
                      <dt className="text-gray-500">{t.memo}</dt>
                      <dd className="whitespace-pre-wrap break-words">{p.memo}</dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 횟수 기록 (최신순) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t.historyTitle}</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t.noHistory}</p>
        ) : (
          <>
            {/* 폰: 줄 목록 */}
            <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 md:hidden">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{t.kinds[e.kind]}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(e.created_at, locale, timeZone)} · {e.creatorName}
                    </p>
                    {e.reason && (
                      <p className="mt-0.5 break-words text-sm text-gray-600">{e.reason}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className={`font-semibold ${e.delta > 0 ? "text-emerald-700" : e.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {signed(e.delta)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(t.timesUnit, { n: e.balance })} {t.remainingShort}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* PC: 표 */}
            <table className="mt-3 hidden w-full text-left text-sm md:table">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">{t.date}</th>
                  <th className="py-2 pr-4 font-medium">{t.kindLabel}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.change}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t.balance}</th>
                  <th className="py-2 font-medium">{t.by}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 align-top">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gray-600">
                      {formatDate(e.created_at, locale, timeZone)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {t.kinds[e.kind]}
                      {e.reason && <span className="block text-gray-500">{e.reason}</span>}
                    </td>
                    <td className={`py-2.5 pr-4 text-right font-semibold tabular-nums ${e.delta > 0 ? "text-emerald-700" : e.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {signed(e.delta)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{e.balance}</td>
                    <td className="py-2.5 text-gray-600">{e.creatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
