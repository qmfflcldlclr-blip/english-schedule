// 달력 위쪽: 도구 한 줄 + 주 제목 상자 (◀ 10월 5일 ~ 11일 ▶)
import Link from "next/link";
import type { Messages } from "@/i18n/server";
import { addDays, formatDayRange } from "@/lib/time";
import ZoomButton from "@/components/ZoomButton";
import WeekPicker from "@/components/calendar/WeekPicker";

type Props = {
  weekFirst: string;
  weekLast: string;
  selected: string;
  today: string;
  showToday: boolean; // 보고 있는 주에 오늘이 없으면 "오늘" 버튼
  locale: string;
  zoomUrl: string | null;
  t: Messages["calendar"];
  settingsT: Messages["settings"];
};

export default function CalendarHeader({ weekFirst, weekLast, selected, today, showToday, locale, zoomUrl, t, settingsT }: Props) {
  const link = (date: string) => `/calendar?date=${date}`;
  return (
    <>
      {/* 도구 한 줄: Zoom · 지난주 복사 · 반복 생성 · 인쇄 · 수업 추가
          (폰은 화면 아래에 떠 있는 추가 버튼이 있어서 여기선 빼고, 나머지 4개를 같은 폭으로) */}
      <div className="grid grid-cols-4 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
        <ZoomButton url={zoomUrl} t={settingsT} />
        <Link href={`/calendar/copy?date=${weekFirst}`} className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white px-1 text-xs whitespace-nowrap md:px-4 md:text-sm">
          {t.copyWeek}
        </Link>
        <Link href={`/calendar/repeat?date=${selected}`} className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white px-1 text-xs whitespace-nowrap md:px-4 md:text-sm">
          {t.repeat}
        </Link>
        <Link href={`/calendar/print?month=${selected.slice(0, 7)}`} className="flex min-h-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white px-1 text-xs whitespace-nowrap md:px-4 md:text-sm">
          🖨️ {t.print}
        </Link>
        <Link
          href={`/calendar/new?date=${selected}`}
          className="hidden min-h-11 shrink-0 items-center rounded-full bg-brand-600 px-4 text-sm font-medium whitespace-nowrap text-white shadow-sm md:flex"
        >
          + {t.add}
        </Link>
      </div>

      {/* 주 제목 상자: ◀ 10월 5일 ~ 11일 ▶ (제목을 누르면 날짜 선택기) */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-linear-to-r from-brand-600 to-brand-500 p-2 text-white shadow-md">
        <Link href={link(addDays(selected, -7))} aria-label={t.prevWeek} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-col items-center">
          <h1>
            <WeekPicker label={formatDayRange(weekFirst, weekLast, locale)} value={selected} ariaLabel={t.pickWeek} className="hover:bg-white/15" />
          </h1>
          {showToday && (
            <Link href={link(today)} className="-mt-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium hover:bg-white/30">
              {t.today}
            </Link>
          )}
        </div>
        <Link href={link(addDays(selected, 7))} aria-label={t.nextWeek} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
