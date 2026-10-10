"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LESSON_MINUTES_MAX } from "@/config/rules";
import { format } from "@/i18n/format";

const SNAP = 15; // 드래그는 15분 단위
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

type Props = {
  date: string;
  fromHour: number; // 시간표 맨 위 시각
  toHour: number; // 시간표 맨 아래 시각
  hourPx: number; // 1시간 높이(px)
  hint: string; // "빈 시간 더블클릭·드래그: 수업 추가"
  minutesUnit: string; // "{n}분"
};

// PC 주간 시간표 하루 칸의 빈 곳: 더블클릭 → 그 시각(30분 단위)으로 추가,
// 드래그 → 시작 시각 + 길이(15분 단위)로 추가. 수업 칸은 이 위에 그려져서 클릭이 그대로 수업으로 감
export default function DaySlots({ date, fromHour, toHour, hourPx, hint, minutesUnit }: Props) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null); // 마우스가 있는 30분 칸 시작(분)
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);

  const minutesAt = (e: React.PointerEvent | React.MouseEvent, step: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = fromHour * 60 + ((e.clientY - rect.top) / hourPx) * 60;
    const snapped = Math.floor(raw / step) * step;
    return Math.min(Math.max(snapped, fromHour * 60), toHour * 60 - step);
  };
  const open = (start: number, duration?: number) =>
    router.push(`/calendar/new?date=${date}&time=${hhmm(start)}${duration ? `&duration=${duration}` : ""}`);

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
        else setHover(minutesAt(e, 30));
      }}
      onPointerUp={() => {
        if (range && drag && drag.end !== drag.start) open(range.start, range.length);
        setDrag(null);
      }}
      onPointerLeave={() => setHover(null)}
      onDoubleClick={(e) => open(minutesAt(e, 30))}
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
            className="pointer-events-none absolute inset-x-1 rounded-md bg-brand-50 px-1.5 pt-0.5 text-xs text-brand-600"
            style={{ top: top(hover), height: hourPx / 2 }}
          >
            + {hhmm(hover)}
          </div>
        )
      )}
    </div>
  );
}
