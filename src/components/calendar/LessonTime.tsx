import { format } from "@/i18n/format";
import { zoneName } from "@/config/timezones";
import { toZoned } from "@/lib/time";
import type { LessonStatus } from "@/lib/lessons";
import type { LessonMark } from "@/lib/plan-timeline";

// 수업 상태별 색 (목록·시간표 공용)
export const statusStyle: Record<LessonStatus, string> = {
  scheduled: "border-gray-300 bg-white",
  completed: "border-gray-200 bg-gray-50 text-gray-500",
  free_cancel: "border-gray-200 bg-gray-50 text-gray-400 line-through",
  absent: "border-red-200 bg-red-50 text-red-800",
};

export const statusBadge: Record<LessonStatus, string> = {
  scheduled: "bg-brand-50 text-brand-700",
  completed: "bg-gray-100 text-gray-600",
  free_cancel: "bg-gray-100 text-gray-500",
  absent: "bg-red-50 text-red-700",
};

// 플랜 첫 수업(초록)·마지막 회차 수업(빨강) 칸 테두리 + 작은 글자
export const markRing: Record<LessonMark, string> = {
  start: "ring-2 ring-emerald-500",
  end: "ring-2 ring-red-500",
  both: "ring-2 ring-red-500",
};

export function MarkBadge({ mark, t }: { mark?: LessonMark; t: { planStart: string; planEnd: string } }) {
  if (!mark) return null;
  const pill = "shrink-0 rounded px-1 text-[10px] leading-4 font-bold text-white";
  return (
    <>
      {mark !== "end" && <span className={`${pill} bg-emerald-600`}>{t.planStart}</span>}
      {mark !== "start" && <span className={`${pill} bg-red-600`}>{t.planEnd}</span>}
    </>
  );
}

type Props = {
  startsAt: string;
  timeZone: string;
  otherTimeZone: string | null;
  locale: string;
  otherLabel: string; // 번역 문구 "{zone} {time}"
  compact?: boolean;
};

// "16:00" 크게 + "(필리핀 15:00)" 작게
export default function LessonTime({
  startsAt,
  timeZone,
  otherTimeZone,
  locale,
  otherLabel,
  compact,
}: Props) {
  const mine = toZoned(startsAt, timeZone);
  const other = otherTimeZone ? toZoned(startsAt, otherTimeZone) : null;
  // 상대 시간대에서 날짜가 달라지면 날짜도 함께 표시
  const otherText = other
    ? format(otherLabel, {
        zone: zoneName(otherTimeZone!, locale),
        time: other.date === mine.date ? other.time : `${other.date.slice(5).replace("-", "/")} ${other.time}`,
      })
    : null;

  return (
    <span className={compact ? "leading-tight" : ""}>
      <span className="font-semibold tabular-nums">{mine.time}</span>
      {otherText && (
        <span className={`tabular-nums text-gray-500 ${compact ? "block text-[11px]" : "ml-1.5 text-xs"}`}>
          ({otherText})
        </span>
      )}
    </span>
  );
}
