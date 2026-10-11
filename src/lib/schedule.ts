import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LESSON_MINUTES_MAX } from "@/config/rules";
import { addDays, fromZoned, toScheduleDay } from "@/lib/time";
import { generateOccurrences, shiftWeeks } from "@/lib/schedule-math";
import { getHolidays } from "@/lib/holidays";
import { getStudentLabels } from "@/lib/student-labels";

type Existing = {
  student_id: string;
  starts_at: string;
  duration_minutes: number;
  status: string;
};

async function lessonsBetween(from: Date, to: Date): Promise<Existing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("student_id, starts_at, duration_minutes, status")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString());
  if (error) throw error;
  return data;
}

const sameSlot = (studentId: string, startsAt: Date) =>
  `${studentId}|${startsAt.getTime()}`;

// ── 주 복사 ──
export type CopyItem = {
  studentId: string;
  studentName: string;
  startsAt: string;
  duration: number;
  duplicate: boolean; // 넣을 주 같은 학생·같은 시각에 이미 있음 → 건너뜀
  holiday: string | null; // 넣을 날이 한국 공휴일 → 건너뜀 (공휴일 이름)
};

// 한국 공휴일 판단 기준 시간대 (새벽 수업은 전날로 봄)
const KR_TIME_ZONE = "Asia/Seoul";

// sourceFirst(가져올 주 첫날) 주의 수업을 targetFirst(넣을 주 첫날) 주로 같은 요일·시각에 복사할 계획
export async function planCopyWeek(targetFirst: string, sourceFirst: string, timeZone: string): Promise<CopyItem[]> {
  const supabase = await createClient();
  const weeks = Math.round((Date.parse(targetFirst) - Date.parse(sourceFirst)) / (7 * 86_400_000));
  const sourceFrom = fromZoned(sourceFirst, "00:00", timeZone);
  const sourceTo = fromZoned(addDays(sourceFirst, 7), "00:00", timeZone);
  const targetFrom = fromZoned(targetFirst, "00:00", timeZone);
  const targetTo = fromZoned(addDays(targetFirst, 7), "00:00", timeZone);

  const [{ data: source, error }, target, holidays, labels] = await Promise.all([
    supabase
      .from("lessons")
      .select("student_id, starts_at, duration_minutes, status, student:students(name, archived)")
      .gte("starts_at", sourceFrom.toISOString())
      .lt("starts_at", sourceTo.toISOString())
      .neq("status", "free_cancel")
      .order("starts_at"),
    lessonsBetween(targetFrom, targetTo),
    getHolidays(addDays(targetFirst, -1), addDays(targetFirst, 7)),
    getStudentLabels(),
  ]);
  if (error) throw error;

  const krHoliday = (at: Date) =>
    holidays[toScheduleDay(at, KR_TIME_ZONE).date]?.find((h) => h.country === "KR")?.name ?? null;
  const taken = new Set(target.map((l) => sameSlot(l.student_id, new Date(l.starts_at))));
  return source.flatMap((l) => {
    const s = (Array.isArray(l.student) ? l.student[0] : l.student) as
      | { name: string; archived: boolean }
      | null;
    if (!s || s.archived || weeks === 0) return [];
    const startsAt = shiftWeeks(l.starts_at, weeks, timeZone);
    return [
      {
        studentId: l.student_id,
        studentName: labels.get(l.student_id) ?? s.name,
        startsAt: startsAt.toISOString(),
        duration: l.duration_minutes,
        duplicate: taken.has(sameSlot(l.student_id, startsAt)),
        holiday: krHoliday(startsAt),
      },
    ];
  });
}

// 가져올 주 고르기용: targetFirst 앞 count 주의 주별 수업 수 (무료 취소 제외, 가까운 주부터)
export async function countRecentWeeks(targetFirst: string, count: number, timeZone: string) {
  const firsts = Array.from({ length: count }, (_, i) => addDays(targetFirst, -7 * (i + 1)));
  const lessons = await lessonsBetween(
    fromZoned(firsts[firsts.length - 1], "00:00", timeZone),
    fromZoned(targetFirst, "00:00", timeZone),
  );
  return firsts.map((first) => {
    const from = fromZoned(first, "00:00", timeZone).getTime();
    const to = fromZoned(addDays(first, 7), "00:00", timeZone).getTime();
    const n = lessons.filter((l) => {
      const t = new Date(l.starts_at).getTime();
      return l.status !== "free_cancel" && t >= from && t < to;
    }).length;
    return { first, count: n };
  });
}

// ── 반복 규칙 ──
export type RepeatItem = {
  date: string;
  startsAt: string;
  duplicate: boolean; // 같은 학생·같은 시각에 이미 있음 → 건너뜀
  overlap: boolean; // 다른 수업과 시간이 겹침 → 경고만
};

export async function planRepeat(opts: {
  studentId: string;
  startDate: string;
  weekdays: number[];
  time: string;
  weeks: number;
  duration: number;
  timeZone: string;
}): Promise<RepeatItem[]> {
  const occurrences = generateOccurrences(opts);
  if (occurrences.length === 0) return [];

  const first = occurrences[0].startsAt.getTime();
  const last = occurrences[occurrences.length - 1].startsAt.getTime();
  const existing = (
    await lessonsBetween(
      new Date(first - LESSON_MINUTES_MAX * 60_000),
      new Date(last + opts.duration * 60_000),
    )
  ).filter((l) => l.status !== "free_cancel");

  const taken = new Set(existing.map((l) => sameSlot(l.student_id, new Date(l.starts_at))));
  return occurrences.map(({ date, startsAt }) => {
    const start = startsAt.getTime();
    const end = start + opts.duration * 60_000;
    const duplicate = taken.has(sameSlot(opts.studentId, startsAt));
    const overlap =
      !duplicate &&
      existing.some((l) => {
        const s = new Date(l.starts_at).getTime();
        return s < end && s + l.duration_minutes * 60_000 > start;
      });
    return { date, startsAt: startsAt.toISOString(), duplicate, overlap };
  });
}
