import { format } from "@/i18n/format";
import { zoneName } from "@/config/timezones";
import { toZoned } from "@/lib/time";
import type { LessonStatus } from "@/lib/lessons";

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
