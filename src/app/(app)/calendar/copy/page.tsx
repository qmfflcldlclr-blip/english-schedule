import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { countRecentWeeks, planCopyWeek } from "@/lib/schedule";
import { copyWeek } from "@/lib/schedule-actions";
import { todayIn } from "@/lib/credit-math";
import { addDays, formatDay, formatDayRange, isDate, toZoned, weekStart } from "@/lib/time";
import SubmitButton from "@/components/SubmitButton";

// 가져올 주 고르기 목록에 보여 줄 주 수
const RECENT_WEEKS = 6;

// 주 복사: 가져올 주를 고르고(기본 지난주), 무엇이 복사될지 먼저 보여 준 뒤 확인 후 복사
// 넣을 주의 한국 공휴일·이미 있는 수업은 건너뜀
export default async function CopyWeekPage({ searchParams }: PageProps<"/calendar/copy">) {
  const [{ locale, t: all }, profile, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
  ]);
  const t = all.calendar;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const weekFirst = weekStart(isDate(sp.date) ? sp.date : todayIn(timeZone));
  const source = isDate(sp.from) ? weekStart(sp.from) : addDays(weekFirst, -7);
  const [items, recent] = await Promise.all([
    planCopyWeek(weekFirst, source, timeZone),
    countRecentWeeks(weekFirst, RECENT_WEEKS, timeZone),
  ]);
  const toCopy = items.filter((i) => !i.duplicate && !i.holiday).length;
  const range = (first: string) => formatDayRange(first, addDays(first, 6), locale);
  const pick = (first: string) => `/calendar/copy?date=${weekFirst}&from=${first}`;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="text-2xl font-bold">{t.copyTitle}</h1>

      <p className="mt-4 text-sm font-medium text-gray-500">{t.copyThisWeek}</p>
      <p className="font-semibold">{range(weekFirst)}</p>

      {/* 가져올 주: 최근 몇 주(수업 수 함께) 또는 날짜로 고르기 */}
      <p className="mt-4 text-sm font-medium text-gray-500">{t.copyFrom}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {recent.map((w) => (
          <li key={w.first}>
            <Link
              href={pick(w.first)}
              aria-current={w.first === source ? "true" : undefined}
              className={`flex min-h-11 items-center rounded-full border px-3 text-sm ${
                w.first === source ? "border-brand-600 bg-brand-600 font-semibold text-white" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {format(t.copyWeekItem, { range: range(w.first), n: w.count })}
            </Link>
          </li>
        ))}
      </ul>
      <form method="get" className="mt-2 flex gap-2">
        <input type="hidden" name="date" value={weekFirst} />
        <input
          type="date"
          name="from"
          defaultValue={source}
          aria-label={t.copyPick}
          className="min-h-11 flex-1 rounded-xl border border-gray-300 px-3 text-base"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium">
          {t.copyPick}
        </button>
      </form>

      <p className="mt-5 text-gray-600">{format(t.copyDesc, { from: range(source), to: range(weekFirst) })}</p>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">{t.copyNone}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {items.map((item, i) => {
            const local = toZoned(item.startsAt, timeZone);
            const skipped = item.duplicate || item.holiday;
            return (
              <li key={i} className={`flex items-center justify-between gap-3 px-4 py-3 ${skipped ? "text-gray-400" : ""}`}>
                <div className="min-w-0">
                  <p className={`font-medium ${item.holiday ? "line-through" : ""}`}>{item.studentName}</p>
                  <p className="text-sm text-gray-500 tabular-nums">
                    {formatDay(local.date, locale)} {local.time} · {format(t.minutesUnit, { n: item.duration })}
                  </p>
                </div>
                {item.holiday ? (
                  <span className="shrink-0 text-xs text-red-500">🇰🇷 {format(t.holidaySkip, { name: item.holiday })}</span>
                ) : (
                  item.duplicate && <span className="shrink-0 text-xs">{t.alreadyExists}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-sm text-gray-500">{t.copySkipNote}</p>

      <form action={copyWeek} className="mt-6 flex gap-3">
        <input type="hidden" name="weekFirst" value={weekFirst} />
        <input type="hidden" name="source" value={source} />
        <Link
          href={`/calendar?date=${weekFirst}`}
          className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white font-medium"
        >
          {t.cancel}
        </Link>
        <SubmitButton
          className="flex-1"
          disabled={toCopy === 0}
          label={format(t.copyConfirm, { n: toCopy })}
          pendingLabel={t.copying}
        />
      </form>
    </main>
  );
}
