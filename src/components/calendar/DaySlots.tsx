"use client";

import { useState } from "react";
import { usePanel } from "@/components/calendar/panel-context";
import { LESSON_MINUTES_MAX } from "@/config/rules";
import { format } from "@/i18n/format";
import { SLOT_MINUTES } from "@/config/schedule";
import { scheduleToActual } from "@/lib/time";

const SNAP = SLOT_MINUTES; // 클릭·드래그 모두 30분 단위
const pad = (n: number) => String(n).padStart(2, "0");
// 시간표 위 표시용 (25:00 이 아니라 01:00 으로)
const hhmm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

type Props = {
  date: string;
  fromHour: number; // 시간표 맨 위 시각
  toHour: number; // 시간표 맨 아래 시각 (25 = 다음 날 01:00)
  hourPx: number; // 1시간 높이(px)
  hint: string; // "빈 시간 더블클릭·드래그: 수업 추가"
  minutesUnit: string; // "{n}분"
};

// PC 주간 시간표 하루 칸의 빈 곳: 한 번 누르기 → 그 시각으로 추가, 드래그 → 시작 시각 + 길이로 추가 (15분 단위).
// 추가 폼은 옆 칸(좁은 화면은 아래 창)에 뜨고, 폼이 이미 열려 있으면 고른 학생·메모는 두고 날짜·시각만 바뀜.
// 자정 넘은 칸은 다음 날 날짜로 넘김. 수업 칸은 이 위에 그려져서 클릭이 그대로 수업으로 감
export default function DaySlots({ date, fromHour, toHour, hourPx, hint, minutesUnit }: Props) {
  const panel = usePanel();
  const [hover, setHover] = useState<number | null>(null); // 마우스가 있는 15분 칸 시작(분)
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);

  const minutesAt = (e: React.PointerEvent | React.MouseEvent, step: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = fromHour * 60 + ((e.clientY - rect.top) / hourPx) * 60;
    const snapped = Math.floor(raw / step) * step;
    return Math.min(Math.max(snapped, fromHour * 60), toHour * 60 - step);
  };
  const open = (start: number, duration?: number) => panel.openNew({ ...scheduleToActual(date, start), duration });

  // 드래그 범위 → 시작, 길이 (위로 끌어도 됨)
  const range = drag && {
    start: Math.min(drag.start, drag.end),
    length: Math.min(Math.abs(drag.end - drag.start) + SNAP, LESSON_MINUTES_MAX),
  };
  const top = (m: number) => ((m - fromHour * 60) / 60) * hourPx;

  return (
    <div
      className="absolute inset-0 cursor-cell select-none"
      title={hint}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const m = minutesAt(e, SNAP);
        setDrag({ start: m, end: m });
      }}
      onPointerMove={(e) => {
        if (drag) setDrag({ ...drag, end: minutesAt(e, SNAP) });
        else setHover(minutesAt(e, SNAP));
      }}
      onPointerUp={() => {
        if (range && drag && drag.end !== drag.start) open(range.start, range.length);
        else if (drag) open(drag.start); // 한 번 누르기
        setDrag(null);
      }}
      onPointerLeave={() => setHover(null)}
    >
      {range ? (
        <div
          className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-brand-500 bg-brand-100/70 px-1.5 text-xs font-semibold text-brand-800"
          style={{ top: top(range.start), height: (range.length / 60) * hourPx }}
        >
          {hhmm(range.start)}–{hhmm(range.start + range.length)} ({format(minutesUnit, { n: range.length })})
        </div>
      ) : (
        hover !== null && (
          <div
            className="pointer-events-none absolute inset-x-1 flex items-center rounded-md bg-brand-50 px-1.5 text-xs text-brand-600"
            style={{ top: top(hover), height: (SNAP / 60) * hourPx }}
          >
            + {hhmm(hover)}
          </div>
        )
      )}
    </div>
  );
}
