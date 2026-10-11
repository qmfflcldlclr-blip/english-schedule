"use client";

// 달력 옆 칸 (넓은 PC: 오른쪽에 고정 / 폰·좁은 화면: 아래에서 올라오는 창)
// 처음: 이름 검색 + 이번 주 학생 → 학생: 한 달 수업 목록 → 수업: 완료·결석·수정·삭제 → 새 수업: 추가 폼
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import type { Lesson } from "@/lib/lessons";
import { loadLesson, loadLessonFeedback, loadStudentMonth, type PanelFeedback, type PanelLesson, type PanelStudent } from "@/lib/panel-actions";
import { addLessonFeedback, removeFeedback } from "@/lib/feedback-actions";
import { feedbackCopyText, kindIcon, kindStyle } from "@/components/feedback/kinds";
import CopyFeedbackButton from "@/components/feedback/CopyFeedbackButton";
import { quickLessonStatus } from "@/lib/lesson-status-actions";
import { removeLesson, saveLessonMemo } from "@/lib/lesson-actions";
import { FEEDBACK_MAX, NOTE_MAX } from "@/config/rules";

type FeedbackKindKey = keyof typeof kindIcon;
import { addMonths } from "@/lib/print-layout";
import { formatDay, toScheduleDay, toZoned } from "@/lib/time";
import { DEFAULT_LESSON_MINUTES } from "@/config/rules";
import { DEFAULT_LESSON_TIME } from "@/config/schedule";
import { usePanel, type PanelView } from "@/components/calendar/panel-context";
import { quickLabels, statusText } from "@/components/calendar/quick-labels";
import LessonTime, { statusBadge } from "@/components/calendar/LessonTime";
import LessonForm from "@/components/calendar/LessonForm";
import StudentCombobox from "@/components/StudentCombobox";

type StudentOption = { id: string; name: string; lesson_minutes: number };
// 달력 문구 + 피드백 문구 (수업 피드백 상자용)
export type CalendarT = Messages["calendar"] & { feedbackKinds: Messages["feedback"] };

// 이번 달(고른 날짜의 달) 현황. 취소(연기)는 횟수·시간에서 뺌
export type MonthSummary = {
  month: string; // "YYYY-MM"
  lessons: number;
  minutes: number;
  doneMinutes: number;
  byMinutes: [number, number][]; // [수업 길이, 횟수] 짧은 순
  completed: number;
  scheduled: number;
  absent: number;
  cancelled: number;
};

type Props = {
  t: CalendarT;
  students: StudentOption[]; // 보관 안 된 학생 (동명이인 번호 포함 이름)
  weekStudents: { id: string; name: string }[]; // 보고 있는 주에 수업이 있는 학생
  days: string[]; // 보고 있는 주 7일
  selected: string; // 고른 날짜
  timeZone: string;
  otherTimeZone: string | null;
  locale: string;
  zoneLabel: string;
  summary: MonthSummary;
};

export default function SidePanel(props: Props) {
  const { t } = props;
  const panel = usePanel();
  const { view } = panel;
  const isHome = view.mode === "home";

  return (
    <>
      {/* 폰·좁은 화면: 뒤를 어둡게, 누르면 닫기 */}
      {!isHome && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={panel.close} aria-hidden />}
      <aside
        aria-label={t.panel.findTitle}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl lg:sticky lg:top-20 lg:inset-auto lg:z-auto lg:max-h-[calc(100dvh-6rem)] lg:rounded-2xl lg:border lg:border-gray-200 lg:pb-4 lg:shadow-sm ${isHome ? "hidden lg:block" : ""}`}
      >
        {!isHome && (
          <div className="-mt-1 mb-2 flex items-center justify-between">
            {view.mode === "overview" ? (
              <span />
            ) : (
              <button type="button" onClick={panel.close} className="min-h-11 text-sm text-gray-600">
                ← {t.panel.home}
              </button>
            )}
            <button type="button" onClick={panel.close} aria-label={t.panel.close} className="flex size-11 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 lg:hidden">
              ✕
            </button>
          </div>
        )}
        <PanelBody {...props} view={view} />
      </aside>
    </>
  );
}

function PanelBody(props: Props & { view: PanelView }) {
  const { view } = props;
  if (view.mode === "student") return <StudentMonth key={view.studentId} {...props} studentId={view.studentId} />;
  if (view.mode === "lesson") return <LessonView key={view.lessonId} {...props} lessonId={view.lessonId} />;
  if (view.mode === "new") return <NewLesson {...props} view={view} />;
  return <Home {...props} />;
}

// ───── 처음: 이번 달 현황 + 이름 검색 + 이번 주 학생 ─────
function Home({ t, students, weekStudents, summary, locale }: Props) {
  const panel = usePanel();
  const show = (id: string) => id && panel.open({ mode: "student", studentId: id });
  const p = t.panel;
  const time = (min: number) =>
    min % 60 ? format(p.hm, { h: Math.floor(min / 60), m: min % 60 }) : format(p.h, { h: min / 60 });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(`${summary.month}-01T00:00:00Z`));
  return (
    <div>
      <section className="mb-5 rounded-xl bg-brand-50 p-3">
        <h2 className="font-bold text-brand-900">{format(p.monthTitle, { month: monthLabel })}</h2>
        <p className="mt-1 text-lg font-semibold">{format(p.monthTotal, { n: summary.lessons, time: time(summary.minutes) })}</p>
        {summary.byMinutes.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5 text-sm">
            {summary.byMinutes.map(([m, n]) => (
              <li key={m} className="rounded-full bg-white px-2.5 py-0.5">
                {format(p.byLength, { m, n })}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-gray-700">
          {format(p.counts, { done: summary.completed, scheduled: summary.scheduled, absent: summary.absent, cancel: summary.cancelled })}
        </p>
        <p className="mt-1 text-sm font-medium text-brand-800">{format(p.doneTime, { time: time(summary.doneMinutes) })}</p>
        <p className="mt-1 text-xs text-gray-500">{p.cancelNote}</p>
      </section>

      <h2 className="text-lg font-bold">{t.panel.findTitle}</h2>
      <p className="mt-1 text-sm text-gray-500">{t.panel.findHint}</p>
      <div className="mt-3">
        <StudentCombobox name="panel_student" students={students} value="" onChange={show} placeholder={t.searchStudent} noMatch={t.noMatch} />
      </div>
      <h3 className="mt-5 text-sm font-medium text-gray-500">{t.panel.weekStudents}</h3>
      {weekStudents.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">{t.panel.noWeekStudents}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {weekStudents.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => show(s.id)} className="min-h-10 rounded-full border border-gray-200 bg-white px-3 text-sm hover:border-brand-300 hover:bg-brand-50">
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───── 학생의 한 달 수업 목록 (수업 화면 아래쪽에도 씀) ─────
function StudentMonth({
  t,
  days,
  selected,
  timeZone,
  locale,
  studentId,
  month: startMonth,
  activeLessonId,
  compact,
}: Props & { studentId: string; month?: string; activeLessonId?: string; compact?: boolean }) {
  const panel = usePanel();
  const router = useRouter();
  const [month, setMonth] = useState(startMonth ?? selected.slice(0, 7));
  const [data, setData] = useState<{ key: string; value: PanelStudent | null } | null>(null);
  const key = `${studentId}|${month}|${panel.version}`;

  useEffect(() => {
    let alive = true;
    loadStudentMonth(studentId, month).then((value) => alive && setData({ key, value }));
    return () => {
      alive = false;
    };
  }, [studentId, month, key]);

  const loading = data?.key !== key;
  const info = data?.value;
  const lessons = info?.lessons ?? [];
  const count = (pred: (l: Lesson) => boolean) => lessons.filter(pred).length;
  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  // 목록에서 수업을 누르면 그 수업을 열고, 다른 주라면 달력도 그 주로
  const openLesson = (l: Lesson) => {
    const day = toScheduleDay(l.starts_at, timeZone).date;
    if (!days.includes(day)) router.push(`/calendar?date=${day}`, { scroll: false });
    panel.open({ mode: "lesson", lessonId: l.id, studentId });
  };

  return (
    <section className={compact ? "mt-6 border-t border-gray-100 pt-4" : ""}>
      {info && !compact && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{info.student.name}</h2>
            <p className={`text-sm font-medium ${info.remaining <= 0 ? "text-red-600" : "text-brand-700"}`}>
              {format(t.remainingNow, { n: info.remaining })}
              {info.student.archived && <span className="ml-2 text-gray-400">{t.panel.archived}</span>}
            </p>
          </div>
          <Link href={`/students/${studentId}`} className="flex min-h-11 shrink-0 items-center text-sm text-gray-600 underline underline-offset-4">
            {t.panel.studentPage}
          </Link>
        </div>
      )}

      <div className={`flex items-center justify-between ${compact ? "" : "mt-3"}`}>
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label={t.panel.prevMonth} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100">
          ‹
        </button>
        <h3 className="text-sm font-semibold">{format(t.panel.monthLessons, { month: monthLabel })}</h3>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label={t.panel.nextMonth} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100">
          ›
        </button>
      </div>

      {loading && !info ? (
        <p className="py-4 text-center text-sm text-gray-400">{t.panel.loading}</p>
      ) : lessons.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">{t.panel.noMonthLessons}</p>
      ) : (
        <>
          <p className="mb-2 text-center text-xs text-gray-500">
            {format(t.panel.counts, {
              done: count((l) => l.status === "completed"),
              scheduled: count((l) => l.status === "scheduled"),
              absent: count((l) => l.status === "absent"),
              cancel: count((l) => l.status === "free_cancel"),
            })}
          </p>
          <ul className={`flex flex-col gap-1 ${loading ? "opacity-60" : ""}`}>
            {lessons.map((l) => {
              const day = toScheduleDay(l.starts_at, timeZone).date;
              const active = l.id === activeLessonId;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => openLesson(l)}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-gray-50 ${active ? "bg-brand-50 ring-1 ring-brand-300" : ""} ${days.includes(day) ? "font-medium" : ""}`}
                  >
                    <span className="w-20 shrink-0 tabular-nums">{formatDay(day, locale, { month: "numeric", day: "numeric", weekday: "short" })}</span>
                    <span className={`shrink-0 tabular-nums ${l.status === "free_cancel" ? "line-through" : ""}`}>{toZoned(l.starts_at, timeZone).time}</span>
                    <span className="shrink-0 text-xs text-gray-400">{format(t.minutesUnit, { n: l.duration_minutes })}</span>
                    {l.memo && <span title={l.memo} aria-label={t.panel.lessonNote} className="shrink-0">📝</span>}
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs ${statusBadge[l.status]}`}>{statusText(l, t)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!compact && (
        <button
          type="button"
          onClick={() => panel.openNew({ date: selected, time: DEFAULT_LESSON_TIME, studentId, duration: info?.student.lesson_minutes })}
          className="mt-4 min-h-12 w-full rounded-xl border border-brand-200 bg-brand-50 font-medium text-brand-700 hover:bg-brand-100"
        >
          {t.panel.addForStudent}
        </button>
      )}
    </section>
  );
}

// ───── 수업: 완료·결석 + 수정 + 삭제, 아래에 그 학생의 한 달 수업 ─────
function LessonView(props: Props & { lessonId: string }) {
  const { t, students, timeZone, otherTimeZone, locale, zoneLabel, lessonId } = props;
  const panel = usePanel();
  const [data, setData] = useState<{ key: string; value: PanelLesson | null } | null>(null);
  const key = `${lessonId}|${panel.version}`;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const labels = quickLabels(t);

  useEffect(() => {
    let alive = true;
    loadLesson(lessonId).then((value) => alive && setData({ key, value }));
    return () => {
      alive = false;
    };
  }, [lessonId, key]);

  if (!data) return <p className="py-6 text-center text-sm text-gray-400">{t.panel.loading}</p>;
  const lesson = data.value;
  if (!lesson) return <p className="py-6 text-center text-sm text-gray-500">{t.panel.lessonGone}</p>;

  const day = toScheduleDay(lesson.starts_at, timeZone).date;
  const local = toZoned(lesson.starts_at, timeZone);
  const scheduled = lesson.status === "scheduled";
  const showStudent = () => panel.open({ mode: "student", studentId: lesson.student_id });

  const run = (action: "complete" | "absent") => {
    if (!window.confirm(action === "complete" ? labels.confirmComplete : labels.confirmAbsent)) return;
    setError(null);
    startTransition(async () => {
      let result = await quickLessonStatus(lesson.id, action);
      if ("confirmRemaining" in result) {
        if (!window.confirm(format(labels.confirmCompleteNoCredits, { n: result.confirmRemaining }))) return;
        result = await quickLessonStatus(lesson.id, action, true);
      }
      if ("error" in result) {
        setError(labels.errors[result.error] ?? labels.errors.unknown);
        return;
      }
      panel.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm(t.deleteConfirm)) return;
    startTransition(async () => {
      const result = await removeLesson(lesson.id);
      if (result.error) {
        setError(t.errors.delete);
        return;
      }
      panel.refresh();
      showStudent();
    });
  };

  // 보관된 학생의 수업이어도 선택 목록에 그 학생이 보이도록
  const options = students.some((s) => s.id === lesson.student_id)
    ? students
    : [...students, { id: lesson.student_id, name: lesson.studentName, lesson_minutes: lesson.duration_minutes }];

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" onClick={showStudent} className="truncate text-left text-lg font-bold underline-offset-4 hover:underline">
            {lesson.studentName}
          </button>
          <p className="text-sm text-gray-600">
            {formatDay(day, locale, { month: "long", day: "numeric", weekday: "short" })}{" "}
            <LessonTime startsAt={lesson.starts_at} timeZone={timeZone} otherTimeZone={otherTimeZone} locale={locale} otherLabel={t.otherTime} />
            {" · "}
            {format(t.minutesUnit, { n: lesson.duration_minutes })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[lesson.status]}`}>{statusText(lesson, t)}</span>
      </div>

      {/* 수업 노트: 둘이 함께 보고 쓰는 노란 상자 (완료된 수업에도 쓸 수 있음) */}
      <LessonNoteBox key={data.key} t={t} lesson={lesson} timeZone={timeZone} onSaved={panel.refresh} />
      <LessonFeedbackBox
        key={lesson.id}
        t={t}
        lessonId={lesson.id}
        studentName={lesson.studentName}
        lessonLabel={format(t.feedbackKinds.lessonOf, {
          date: `${formatDay(day, locale, { month: "numeric", day: "numeric", weekday: "short" })} ${local.time}`,
        })}
        timeZone={timeZone}
        version={panel.version}
        onChanged={panel.refresh}
      />

      {scheduled && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={pending} onClick={() => run("complete")} className="min-h-12 rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-60">
            ✓ {labels.complete}
          </button>
          <button type="button" disabled={pending} onClick={() => run("absent")} className="min-h-12 rounded-xl border border-red-200 bg-red-50 font-semibold text-red-700 disabled:opacity-60">
            ✕ {labels.absent}
          </button>
        </div>
      )}
      {pending && <p className="mt-2 text-center text-sm text-gray-500">{labels.processing}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        {!scheduled ? <p className="text-xs text-gray-500">{t.panel.processedHint}</p> : <span />}
        <Link href={`/calendar/lessons/${lesson.id}`} className="flex min-h-11 shrink-0 items-center text-sm font-medium text-gray-600 underline underline-offset-4">
          {labels.details} ›
        </Link>
      </div>

      {scheduled && (
        <details className="mt-2 rounded-xl border border-gray-200 p-3 open:pb-4">
          <summary className="min-h-8 cursor-pointer font-medium">{t.editTitle}</summary>
          <div className="mt-3">
            <LessonForm
              key={`${lesson.id}|${data.key}`}
              t={t}
              students={options}
              zoneLabel={zoneLabel}
              cancelHref={`/calendar?date=${day}`}
              hideMemo
              panel={{ onCancel: showStudent, onSaved: () => panel.refresh() }}
              initial={{
                lessonId: lesson.id,
                studentId: lesson.student_id,
                date: local.date,
                time: local.time,
                duration: lesson.duration_minutes,
                memo: lesson.memo ?? "",
              }}
            />
            <div className="mt-3 flex justify-end">
              <button type="button" disabled={pending} onClick={remove} className="min-h-11 rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
                {t.delete}
              </button>
            </div>
          </div>
        </details>
      )}

      <StudentMonth {...props} studentId={lesson.student_id} month={day.slice(0, 7)} activeLessonId={lesson.id} compact />
    </div>
  );
}

// ───── 새 수업 ─────
function NewLesson({ t, students, zoneLabel, view }: Props & { view: Extract<PanelView, { mode: "new" }> }) {
  const panel = usePanel();
  const preset = students.find((s) => s.id === view.studentId);
  return (
    <div>
      <h2 className="text-lg font-bold">{t.newTitle}</h2>
      <p className="mt-1 hidden text-sm text-gray-500 md:block">💡 {t.panel.slotHint}</p>
      <div className="mb-4" />
      {students.length === 0 ? (
        <p className="text-gray-600">
          {t.noStudents}{" "}
          <Link href="/students/new" className="underline underline-offset-4">
            +
          </Link>
        </p>
      ) : (
        <LessonForm
          key={view.studentId ?? ""} // "이 학생 수업 추가"로 학생이 바뀌면 폼을 새로
          t={t}
          students={students}
          zoneLabel={zoneLabel}
          cancelHref={`/calendar?date=${view.date}`}
          keepDuration={Boolean(view.duration)}
          panel={{
            onCancel: panel.close,
            onSaved: (saved) => {
              panel.refresh();
              panel.open({ mode: "lesson", lessonId: saved.lessonId, studentId: saved.studentId });
            },
            slot: { date: view.date, time: view.time, duration: view.duration, n: view.slot },
          }}
          initial={{
            studentId: preset?.id ?? "",
            date: view.date,
            time: view.time,
            duration: view.duration ?? preset?.lesson_minutes ?? DEFAULT_LESSON_MINUTES,
            memo: "",
          }}
        />
      )}
    </div>
  );
}

// ───── 수업 노트 상자 ─────
function LessonNoteBox({ t, lesson, timeZone, onSaved }: { t: CalendarT; lesson: PanelLesson; timeZone: string; onSaved: () => void }) {
  const p = t.panel;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(lesson.memo ?? "");
  const [original, setOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = (!original && lesson.memoT) || lesson.memo;
  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${Number(z.date.slice(5, 7))}/${Number(z.date.slice(8))} ${z.time}`;
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveLessonMemo(lesson.id, text);
      if ("error" in result) {
        setError(p.noteErrors[result.error]);
        return;
      }
      setEditing(false);
      onSaved(); // 달력 칸·옆 칸 새로 (번역도 새로)
    });

  return (
    <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-amber-900">📝 {p.lessonNote}</h3>
        {!editing && (
          <div className="flex items-center gap-1">
            {lesson.memo && lesson.memoT && (
              <button type="button" onClick={() => setOriginal((v) => !v)} className="min-h-9 rounded-full px-2 text-xs text-amber-800 hover:bg-white/70">
                🌐 {original ? p.showTranslated : p.showOriginal}
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="min-h-9 rounded-full px-3 text-sm font-medium text-amber-900 hover:bg-white/70">
              ✏️ {p.noteWrite}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={NOTE_MAX}
            autoFocus
            placeholder={p.lessonNotePlaceholder}
            className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setText(lesson.memo ?? "");
                setEditing(false);
                setError(null);
              }}
              className="min-h-11 flex-1 rounded-lg border border-gray-300 bg-white text-sm font-medium"
            >
              {p.noteCancel}
            </button>
            <button type="button" disabled={pending} onClick={save} className="min-h-11 flex-1 rounded-lg bg-amber-500 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? p.noteSaving : p.noteSave}
            </button>
          </div>
        </div>
      ) : shown ? (
        <p className="mt-1 whitespace-pre-wrap break-words text-gray-800">{shown}</p>
      ) : (
        <p className="mt-1 text-sm text-amber-700/80">{p.lessonNoteEmpty}</p>
      )}

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {!editing && lesson.memo && lesson.memoMeta && (
        <p className="mt-1 text-xs text-amber-700/80">{format(p.noteBy, { time: stamp(lesson.memoMeta.at), name: lesson.memoMeta.by })}</p>
      )}
    </section>
  );
}

// ───── 수업 피드백: 이 수업의 피드백 목록(번역·카톡용 복사) + 쓰기 ─────
function LessonFeedbackBox({ t, lessonId, studentName, lessonLabel, timeZone, version, onChanged }: {
  t: CalendarT;
  lessonId: string;
  studentName: string;
  lessonLabel: string; // 복사할 때 "10/12 (월) 18:00 수업"
  timeZone: string;
  version: number;
  onChanged: () => void;
}) {
  const p = t.panel;
  const fb = t.feedbackKinds;
  const [data, setData] = useState<{ key: string; me: string; items: PanelFeedback[] } | null>(null);
  const key = `${lessonId}|${version}`;
  const [writing, setWriting] = useState(false);
  const [kind, setKind] = useState<FeedbackKindKey>("good");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    loadLessonFeedback(lessonId).then((r) => alive && setData({ key, ...r }));
    return () => {
      alive = false;
    };
  }, [lessonId, key]);

  const stamp = (iso: string) => {
    const z = toZoned(iso, timeZone);
    return `${Number(z.date.slice(5, 7))}/${Number(z.date.slice(8))} ${z.time}`;
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await addLessonFeedback(lessonId, kind, text);
      if ("error" in result) {
        setError(p.feedbackErrors[result.error]);
        return;
      }
      setText("");
      setWriting(false);
      onChanged(); // 달력 💬 표시 + 목록 새로
    });

  const remove = (id: string) => {
    if (!window.confirm(fb.deleteConfirm)) return;
    startTransition(async () => {
      await removeFeedback(id);
      onChanged();
    });
  };

  return (
    <section className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-brand-900">💬 {p.lessonFeedback}</h3>
        {!writing && (
          <button type="button" onClick={() => setWriting(true)} className="min-h-9 rounded-full px-3 text-sm font-medium text-brand-800 hover:bg-white/70">
            {p.feedbackWrite}
          </button>
        )}
      </div>

      {writing && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-1.5">
            {(Object.keys(kindIcon) as FeedbackKindKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-10 flex-1 rounded-lg border text-sm font-medium ${kind === k ? kindStyle[k] + " ring-2 ring-brand-300" : "border-gray-200 bg-white text-gray-600"}`}
              >
                {kindIcon[k]} {fb.kinds[k]}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={FEEDBACK_MAX}
            autoFocus
            placeholder={p.feedbackPlaceholder}
            className="w-full rounded-lg border border-brand-200 bg-white p-2.5 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setWriting(false);
                setError(null);
              }}
              className="min-h-11 flex-1 rounded-lg border border-gray-300 bg-white text-sm font-medium"
            >
              {p.feedbackCancel}
            </button>
            <button type="button" disabled={pending || !text.trim()} onClick={save} className="min-h-11 flex-1 rounded-lg bg-brand-600 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? p.feedbackSaving : p.feedbackSave}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {!data ? (
        <p className="mt-2 text-sm text-gray-400">{p.loading}</p>
      ) : data.items.length === 0 ? (
        !writing && <p className="mt-1 text-sm text-brand-800/70">{p.feedbackEmpty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {data.items.map((f) => (
            <li key={f.id} className="rounded-lg bg-white p-2.5 shadow-sm">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${kindStyle[f.kind]}`}>
                {kindIcon[f.kind]} {fb.kinds[f.kind]}
              </span>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-gray-800">{f.translated || f.content}</p>
              {f.translated && (
                <details className="mt-1 text-xs text-gray-500">
                  <summary className="cursor-pointer">🌐 {fb.original}</summary>
                  <p className="mt-1 whitespace-pre-wrap">{f.content}</p>
                </details>
              )}
              <div className="mt-1 flex items-center justify-between gap-1 text-xs text-gray-500">
                <span>
                  {f.authorName} · {stamp(f.createdAt)}
                </span>
                <span className="-my-2 flex items-center">
                  <CopyFeedbackButton
                    labels={{ copy: fb.copy, copied: fb.copied }}
                    text={feedbackCopyText({ studentName, lessonLabel, icon: kindIcon[f.kind], kind: fb.kinds[f.kind], text: f.translated || f.content })}
                  />
                  {f.createdBy === data.me && (
                    <button type="button" disabled={pending} onClick={() => remove(f.id)} className="flex min-h-11 items-center rounded-full px-2 text-red-600 hover:bg-red-50">
                      {fb.delete}
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
