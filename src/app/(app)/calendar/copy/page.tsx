import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { format } from "@/i18n/format";
import { getCurrentProfile } from "@/lib/supabase/server";
import { planCopyWeek } from "@/lib/schedule";
import { copyLastWeek } from "@/lib/schedule-actions";
import { todayIn } from "@/lib/credit-math";
import { addDays, formatDay, formatDayRange, isDate, toZoned, weekStart } from "@/lib/time";
import SubmitButton from "@/components/SubmitButton";

// 지난주 복사: 무엇이 복사될지 먼저 보여주고 확인 후 복사
export default async function CopyWeekPage({ searchParams }: PageProps<"/calendar/copy">) {
  const [{ locale, t: all }, profile, sp] = await Promise.all([
    getDictionary(),
    getCurrentProfile(),
    searchParams,
  ]);
  const t = all.calendar;
  const timeZone = (profile?.timezone as string) ?? "UTC";
  const monday = weekStart(isDate(sp.date) ? sp.date : todayIn(timeZone));
  const items = await planCopyWeek(monday, timeZone);
  const toCopy = items.filter((i) => !i.duplicate).length;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="text-2xl font-bold">{t.copyTitle}</h1>
      <p className="mt-2 text-gray-600">
        {format(t.copyDesc, {
          from: formatDayRange(addDays(monday, -7), addDays(monday, -1), locale),
          to: formatDayRange(monday, addDays(monday, 6), locale),
        })}
      </p>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">{t.copyNone}</p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {items.map((item, i) => {
            const local = toZoned(item.startsAt, timeZone);
            return (
              <li key={i} className={`flex items-center justify-between gap-3 px-4 py-3 ${item.duplicate ? "text-gray-400" : ""}`}>
                <div className="min-w-0">
                  <p className="font-medium">{item.studentName}</p>
                  <p className="text-sm text-gray-500 tabular-nums">
                    {formatDay(local.date, locale)} {local.time} · {format(t.minutesUnit, { n: item.duration })}
                  </p>
                </div>
                {item.duplicate && <span className="shrink-0 text-xs">{t.alreadyExists}</span>}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-sm text-gray-500">{t.copySkipNote}</p>

      <form action={copyLastWeek} className="mt-6 flex gap-3">
        <input type="hidden" name="monday" value={monday} />
        <Link
          href={`/calendar?date=${monday}`}
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
