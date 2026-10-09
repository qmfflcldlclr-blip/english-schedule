import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LESSON_MINUTES_MAX } from "@/config/rules";
import { addDays, fromZoned } from "@/lib/time";
import { generateOccurrences, shiftOneWeek } from "@/lib/schedule-math";

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

// ── 지난주 복사 ──
export type CopyItem = {
  studentId: string;
  studentName: string;
  startsAt: string;
  duration: number;
  duplicate: boolean; // 이번 주 같은 학생·같은 시각에 이미 있음 → 건너뜀
};

// monday 가 속한 주로, 바로 전 주의 수업을 복사할 계획
export async function planCopyWeek(monday: string, timeZone: string): Promise<CopyItem[]> {
  const supabase = await createClient();
  const prevFrom = fromZoned(addDays(monday, -7), "00:00", timeZone);
  const thisFrom = fromZoned(monday, "00:00", timeZone);
  const thisTo = fromZoned(addDays(monday, 7), "00:00", timeZone);

  const [{ data: source, error }, target] = await Promise.all([
    supabase
      .from("lessons")
      .select("student_id, starts_at, duration_minutes, status, student:students(name, archived)")
      .gte("starts_at", prevFrom.toISOString())
      .lt("starts_at", thisFrom.toISOString())
      .neq("status", "free_cancel")
      .order("starts_at"),
    lessonsBetween(thisFrom, thisTo),
  ]);
  if (error) throw error;

  const taken = new Set(target.map((l) => sameSlot(l.student_id, new Date(l.starts_at))));
  return source.flatMap((l) => {
    const s = (Array.isArray(l.student) ? l.student[0] : l.student) as
      | { name: string; archived: boolean }
      | null;
    if (!s || s.archived) return [];
    const startsAt = shiftOneWeek(l.starts_at, timeZone);
    return [
      {
        studentId: l.student_id,
        studentName: s.name,
        startsAt: startsAt.toISOString(),
        duration: l.duration_minutes,
        duplicate: taken.has(sameSlot(l.student_id, startsAt)),
      },
    ];
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
