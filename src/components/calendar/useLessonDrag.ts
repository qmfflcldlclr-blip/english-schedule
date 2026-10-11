"use client";

// PC 시간표에서 예정 수업 칸을 끌어 다른 날·시각으로 옮기기 (15분 단위)
// 마우스를 조금(DRAG_START_PX) 이상 움직여야 "끌기"로 봄 → 그냥 누르면 지금처럼 빠른 처리 창이 열림
import { useRef, useState, useTransition } from "react";
import { usePanel } from "@/components/calendar/panel-context";
import { format } from "@/i18n/format";
import { moveLesson } from "@/lib/lesson-actions";
import { formatDay, scheduleToActual } from "@/lib/time";
import { DAY_CUTOFF_HOUR, SLOT_MINUTES } from "@/config/schedule";

const DRAG_START_PX = 5;
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export type MoveLabels = {
  confirmMove: string; // "{name} 수업을 옮길까요?\n{from} → {to}"
  moveOverlap: string; // "... {list} ..."
  moveFailed: string;
  overlapItem: string; // "{time} {name} ({n}분)"
};

export type MoveConfig = {
  date: string; // 지금 있는 수업일 (시간표 칸 날짜)
  minutes: number; // 그 수업일 0시부터 센 시작 분 (새벽 수업은 24시 넘음)
  duration: number;
  fromHour: number; // 시간표 맨 위 시각
  hourPx: number;
  studentName: string;
  locale: string;
  labels: MoveLabels;
};

type Target = { date: string; minutes: number; dx: number; dy: number };

export function useLessonDrag(lessonId: string, move?: MoveConfig) {
  const panel = usePanel();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Target | null>(null);
  const start = useRef<{ x: number; y: number; grab: number; colLeft: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false); // 끌기 직후 따라오는 클릭은 무시

  const reset = () => {
    start.current = null;
    dragging.current = false;
    setTarget(null);
  };

  // 마우스 위치 → 놓일 날짜 칸과 시작 시각 (칸 밖이면 직전 위치 유지)
  const locate = (e: React.PointerEvent): Target | null => {
    if (!move || !start.current) return null;
    const col = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => (el as HTMLElement).closest<HTMLElement>("[data-day]"))
      .find(Boolean);
    if (!col?.dataset.day) return target;
    const rect = col.getBoundingClientRect();
    const raw = move.fromHour * 60 + ((e.clientY - rect.top) / move.hourPx) * 60 - start.current.grab;
    const snapped = Math.round(raw / SLOT_MINUTES) * SLOT_MINUTES;
    const max = (24 + DAY_CUTOFF_HOUR) * 60 - move.duration; // 다음 수업일 시작 전까지
    const minutes = Math.min(Math.max(snapped, move.fromHour * 60), max);
    return {
      date: col.dataset.day,
      minutes,
      dx: rect.left - start.current.colLeft,
      dy: ((minutes - move.minutes) / 60) * move.hourPx,
    };
  };

  const label = (date: string, minutes: number) =>
    `${formatDay(scheduleToActual(date, minutes).date, move?.locale ?? "en")} ${hhmm(minutes)}`;

  const save = (to: Target) => {
    if (!move) return;
    const msg = format(move.labels.confirmMove, {
      name: move.studentName,
      from: label(move.date, move.minutes),
      to: label(to.date, to.minutes),
    });
    if (!window.confirm(msg)) return reset();
    const at = scheduleToActual(to.date, to.minutes);
    startTransition(async () => {
      let result = await moveLesson(lessonId, at.date, at.time);
      if ("overlaps" in result) {
        const list = result.overlaps
          .map((o) => format(move.labels.overlapItem, { time: o.time, name: o.name, n: o.minutes }))
          .join(", ");
        if (!window.confirm(format(move.labels.moveOverlap, { list }))) return reset();
        result = await moveLesson(lessonId, at.date, at.time, true);
      }
      if ("error" in result) {
        window.alert(move.labels.moveFailed);
        return reset();
      }
      panel.refresh(); // 달력 + 옆 칸 목록 새로
      reset();
    });
  };

  const handlers = move
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || pending) return;
          const self = e.currentTarget.getBoundingClientRect();
          const col = e.currentTarget.parentElement?.getBoundingClientRect();
          start.current = {
            x: e.clientX,
            y: e.clientY,
            grab: ((e.clientY - self.top) / move.hourPx) * 60, // 칸의 어디를 잡았는지(분)
            colLeft: col?.left ?? self.left,
          };
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
          if (!start.current) return;
          if (!dragging.current) {
            if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) < DRAG_START_PX) return;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setTarget(locate(e));
        },
        onPointerUp: () => {
          if (!dragging.current) {
            start.current = null;
            return;
          }
          justDragged.current = true;
          const to = target;
          dragging.current = false;
          start.current = null;
          if (to && (to.date !== move.date || to.minutes !== move.minutes)) save(to);
          else setTarget(null);
        },
        onPointerCancel: reset,
      }
    : {};

  // 끌기로 끝난 경우 true (이때는 빠른 처리 창을 열지 않음)
  const consumeClick = () => {
    const was = justDragged.current;
    justDragged.current = false;
    return was;
  };

  return {
    handlers,
    consumeClick,
    pending,
    // 끄는 동안 칸 위치·새 시각 표시
    dragStyle: target ? { transform: `translate(${target.dx}px, ${target.dy}px)`, zIndex: 30 } : undefined,
    dragLabel: target ? label(target.date, target.minutes) : null,
  };
}
