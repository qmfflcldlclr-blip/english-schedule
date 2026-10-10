// 월간 일정 인쇄용 종이 (A4 가로 두 장: 1쪽 달력, 2쪽 이번 달 횟수 표). 데이터는 받기만 하고 그리기만 함
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { fitCalendar, fitSummary, monthWeeks, PAGE } from "@/lib/print-layout";
import { LogoMark } from "@/components/Illustrations";

export type PrintEntry = { id: string; time: string; name: string; note: string; strike: boolean };
export type PrintRow = {
  id: string;
  name: string;
  completed: number;
  scheduled: number;
  free: number;
  absent: number;
  remaining: number;
};

type Props = {
  month: string; // "YYYY-MM"
  heading: string; // "2026년 10월 · 전체 학생"
  meta: string; // "한국 시간 기준 · 출력 2026-10-10"
  days: Record<string, PrintEntry[]>; // 날짜별 수업 (시간순)
  summary: PrintRow[];
  t: Messages["print"];
  weekdayNames: string[];
  timesUnit: string; // "{n}회"
};

const cell = "border border-gray-400";

// 종이 한 장: 화면에서는 흰 종이 미리보기, 인쇄할 때는 장마다 새 쪽
function Paper({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`w-fit bg-white p-[7mm] shadow-md ring-1 ring-gray-200 print:p-0 print:shadow-none print:ring-0 ${
        last ? "" : "mb-6 break-after-page print:mb-0"
      }`}
    >
      <div className="overflow-hidden text-black" style={{ width: `${PAGE.width}mm`, height: `${PAGE.height}mm` }}>
        {children}
      </div>
    </div>
  );
}

function Title({ heading, meta, sub }: { heading: string; meta: string; sub?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-black pb-[1mm]" style={{ height: "10mm" }}>
      <div className="flex min-w-0 items-center gap-[2mm] text-[13pt]">
        <LogoMark className="size-[6.5mm] shrink-0" />
        <span className="font-extrabold whitespace-nowrap">Andy English</span>
        <span className="truncate font-bold">
          · {heading}
          {sub && ` · ${sub}`}
        </span>
      </div>
      <span className="shrink-0 text-[7.5pt] text-gray-600">{meta}</span>
    </div>
  );
}

export default function PrintSheet({ month, heading, meta, days, summary, t, weekdayNames, timesUnit }: Props) {
  const weeks = monthWeeks(month);
  const fit = fitCalendar(weeks.map((w) => Math.max(...w.map((d) => days[d]?.length ?? 0))));
  const sf = fitSummary(summary.length);
  const chunks = Array.from({ length: sf.cols }, (_, i) => summary.slice(i * sf.perCol, (i + 1) * sf.perCol)).filter(
    (c) => c.length,
  );
  const total = summary.reduce(
    (s, r) => ({
      completed: s.completed + r.completed,
      scheduled: s.scheduled + r.scheduled,
      free: s.free + r.free,
      absent: s.absent + r.absent,
    }),
    { completed: 0, scheduled: 0, free: 0, absent: 0 },
  );

  return (
    <>
      {/* ───── 1쪽: 달력 ───── */}
      <Paper>
        {/* 넘칠 때는 더 큰 종이에 그린 뒤 축소 → 축소 후에도 가로는 꽉 차고 세로는 한 장 */}
        <div style={{ width: `${PAGE.width / fit.scale}mm`, zoom: fit.scale }}>
          <Title heading={heading} meta={meta} />
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr style={{ height: "5mm" }}>
                {weekdayNames.map((w) => (
                  <th key={w} className={`${cell} bg-gray-100 text-[8pt] font-bold`}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={week[0]} style={{ height: `${fit.weekHeights[wi]}mm` }}>
                  {week.map((d) => {
                    const items = days[d] ?? [];
                    return (
                      <td key={d} className={`${cell} overflow-hidden px-[1mm] pt-[0.4mm] align-top`}>
                        <div className={`text-[7.5pt] leading-[3.2mm] font-bold ${d.startsWith(month) ? "" : "text-gray-300"}`}>
                          {Number(d.slice(8))}
                        </div>
                        {items.length > 0 && (
                          <ul
                            style={{
                              fontSize: `${fit.fontMm}mm`,
                              lineHeight: 1.25,
                              columnCount: fit.weekCols[wi],
                              columnGap: "1mm",
                            }}
                          >
                            {items.map((e) => (
                              <li key={e.id} className={`truncate ${e.strike ? "text-gray-500 line-through" : ""}`}>
                                <span className="font-semibold tabular-nums">{e.time}</span> {e.name}
                                {e.note && <span className="text-[0.85em]">({e.note})</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Paper>

      {/* ───── 2쪽: 이번 달 횟수 ───── */}
      <Paper last>
        <Title heading={heading} meta={meta} sub={t.summaryTitle} />
        {summary.length === 0 ? (
          <p className="mt-[4mm] text-[10pt] text-gray-600">{t.noLessons}</p>
        ) : (
          <>
            <p className="mt-[2mm] text-right text-[9pt] text-gray-700" style={{ height: "6mm" }}>
              {t.total}: {t.colMonth} <b>{total.completed + total.scheduled}</b> · {t.colCompleted} {total.completed} ·{" "}
              {t.colScheduled} {total.scheduled} · {t.colFree} {total.free} · {t.colAbsent} {total.absent}
            </p>
            <div className="flex items-start gap-[5mm]">
              {chunks.map((chunk, ci) => (
                <table
                  key={ci}
                  className="flex-1 table-fixed border-collapse"
                  style={{ fontSize: `${sf.fontMm}mm`, lineHeight: `${sf.rowMm}mm` }}
                >
                  <thead>
                    <tr className="bg-gray-100">
                      <th className={`${cell} w-[28%] px-[1.5mm] text-left`}>{t.colStudent}</th>
                      <th className={cell}>{t.colMonth}</th>
                      <th className={cell}>{t.colCompleted}</th>
                      <th className={cell}>{t.colScheduled}</th>
                      <th className={cell}>{t.colFree}</th>
                      <th className={cell}>{t.colAbsent}</th>
                      <th className={cell}>{t.colRemaining}</th>
                    </tr>
                  </thead>
                  <tbody className="text-center tabular-nums">
                    {chunk.map((r) => (
                      <tr key={r.id}>
                        <td className={`${cell} truncate px-[1.5mm] text-left font-semibold`}>{r.name}</td>
                        <td className={`${cell} font-bold`}>{r.completed + r.scheduled}</td>
                        <td className={cell}>{r.completed}</td>
                        <td className={cell}>{r.scheduled}</td>
                        <td className={cell}>{r.free}</td>
                        <td className={cell}>{r.absent}</td>
                        <td className={`${cell} font-bold`}>{format(timesUnit, { n: r.remaining })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </>
        )}
      </Paper>
    </>
  );
}
