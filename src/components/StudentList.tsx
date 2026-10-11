"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { matchesSearch } from "@/lib/search";
import { LOW_CREDIT_THRESHOLD } from "@/config/rules";
import StudentPanel, { type PanelT } from "@/components/StudentPanel";
import { archiveStudents, deleteStudentsPermanently, type BulkResult } from "@/lib/student-actions";

export type StudentRow = {
  id: string;
  name: string;
  label: string; // 동명이인은 "김민준 #2"
  privateNote: string; // 내 개별용 노트
  sharedNote: string; // 공유용 노트
  privateNoteT?: string | null; // 화면 언어로 번역한 노트 (번역 필요 없으면 null)
  sharedNoteT?: string | null;
  lesson_minutes: number;
  remaining: number;
  expired: boolean;
};

type Props = {
  students: StudentRow[];
  archivedView: boolean; // 보관된 학생 목록이면 true
  autoArchiveDays: number;
  t: Messages["students"] & { timesUnit: string; expired: string };
  panel: { t: PanelT; locale: string; timeZone: string; hoursBefore: number }; // 옆 칸
};

// 학생 목록: 검색(이름·노트, 초성) + 체크박스로 여러 명 보관·완전 삭제
// 현재 학생 목록에서는 남은 횟수 0회 학생을 맨 아래 묶음으로 따로 보여 줌
export default function StudentList({ students, archivedView, autoArchiveDays, t, panel }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // 옆 칸: 고른 학생, 저장할 때마다 늘어나는 번호(옆 칸이 다시 가져옴)
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const changed = () => {
    router.refresh();
    setVersion((n) => n + 1);
  };
  // 이름 링크: 그냥 누르면 옆 칸, Ctrl·가운데 클릭은 새 탭에서 상세
  const openPanel = (e: React.MouseEvent, id: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOpenId(id);
  };
  // 노트: 번역(기본) ↔ 원문. 번역된 노트가 하나라도 있을 때만 버튼을 보여 줌
  const [original, setOriginal] = useState(false);
  const hasTranslation = students.some((s) => s.privateNoteT || s.sharedNoteT);
  const note = (text: string, translated?: string | null) => (!original && translated) || text;

  const shown = students.filter((s) => matchesSearch(`${s.label} ${s.name} ${s.privateNote} ${s.sharedNote} ${s.privateNoteT ?? ""} ${s.sharedNoteT ?? ""}`, query));
  const zero = archivedView ? [] : shown.filter((s) => s.remaining === 0);
  const main = archivedView ? shown : shown.filter((s) => s.remaining !== 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allShownSelected = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const toggleAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((s) => s.id)));

  const finish = (result: BulkResult) => {
    if ("error" in result) {
      setMessage({ ok: false, text: t.bulkErrors[result.error] });
      return;
    }
    setMessage({ ok: true, text: format(t.bulkDone, { n: result.count }) });
    setSelected(new Set());
    router.refresh();
  };
  const ids = [...selected];
  const archive = () => startTransition(async () => finish(await archiveStudents(ids, !archivedView)));
  const remove = () => {
    const names = students.filter((s) => selected.has(s.id)).map((s) => s.label);
    const shownNames = names.slice(0, 8).join(", ") + (names.length > 8 ? ` …(+${names.length - 8})` : "");
    const typed = window.prompt(format(t.deletePrompt, { n: names.length, names: shownNames, word: t.deleteWord }));
    if (typed === null) return;
    if (typed.trim() !== t.deleteWord) {
      setMessage({ ok: false, text: t.deleteMismatch });
      return;
    }
    startTransition(async () => finish(await deleteStudentsPermanently(ids)));
  };

  // 남은 횟수 배지 + "기간 지남" 표시 (0회 이하 빨강, 얼마 안 남으면 주황, 넉넉하면 초록)
  const remaining = (s: StudentRow) => (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
          s.remaining <= 0
            ? "bg-red-100 text-red-700"
            : s.remaining <= LOW_CREDIT_THRESHOLD
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {format(t.timesUnit, { n: s.remaining })}
      </span>
      {s.expired && (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{t.expired}</span>
      )}
    </span>
  );

  const check = (s: StudentRow) => (
    <input
      type="checkbox"
      checked={selected.has(s.id)}
      onChange={() => toggle(s.id)}
      onClick={(e) => e.stopPropagation()} // 체크칸을 눌러도 옆 칸은 안 열림
      aria-label={format(t.selectStudent, { name: s.label })}
      className="size-5 cursor-pointer accent-brand-600"
    />
  );

  // 폰: 카드형 목록
  const cards = (rows: StudentRow[]) => (
    <ul className="flex flex-col gap-2 md:hidden">
      {rows.map((s) => (
        <li key={s.id} className="flex items-stretch gap-1">
          <label className="flex w-11 shrink-0 cursor-pointer items-center justify-center">
            {check(s)}
          </label>
          <Link
            href={`/students/${s.id}`}
            onClick={(e) => openPanel(e, s.id)}
            className={`flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm active:bg-gray-50 ${
              selected.has(s.id) || openId === s.id ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {s.label}
                {/* 영어 화면: 한글 이름도 작게 */}
                {!s.label.startsWith(s.name) && <span className="ml-1.5 text-sm font-normal text-gray-400">{s.name}</span>}
              </p>
              {s.privateNote && <p className="truncate text-sm text-gray-500">🔒 {note(s.privateNote, s.privateNoteT)}</p>}
              {s.sharedNote && <p className="truncate text-sm text-gray-500">👥 {note(s.sharedNote, s.sharedNoteT)}</p>}
            </div>
            <div className="shrink-0 text-right">
              {remaining(s)}
              <p className="text-xs text-gray-500">{format(t.minutesUnit, { n: s.lesson_minutes })}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  // PC: 표 (머리글 회색 띠, 줄마다 옅은 줄무늬, 노트는 두 줄까지)
  const noteCell = (text: string, translated?: string | null) => (
    <td className="w-1/2 max-w-0 px-3 py-3 align-top text-sm text-gray-600" title={text || undefined}>
      {text ? (
        <p className="line-clamp-2 break-words whitespace-pre-line">{note(text, translated)}</p>
      ) : (
        <span className="text-gray-300">—</span>
      )}
    </td>
  );
  const table = (rows: StudentRow[], withHeader: boolean) => (
    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
      <table className="w-full text-left">
        {withHeader && (
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="w-14 min-w-14 py-3 pr-3 pl-4">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  onChange={toggleAll}
                  aria-label={t.selectAll}
                  className="size-5 cursor-pointer accent-brand-600"
                />
              </th>
              <th className="py-3 pr-4 whitespace-nowrap">{t.name}</th>
              <th className="py-3 pr-4 whitespace-nowrap">{t.remaining}</th>
              <th className="py-3 pr-4 whitespace-nowrap">{t.lessonMinutes}</th>
              <th className="px-3 py-3 whitespace-nowrap">🔒 {t.privateNote}</th>
              <th className="px-3 py-3 whitespace-nowrap">👥 {t.sharedNote}</th>
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-100">
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => setOpenId(s.id)} // 줄 어디를 눌러도 옆 칸
              aria-selected={openId === s.id}
              className={`cursor-pointer transition-colors hover:bg-brand-50/60 ${
                openId === s.id ? "bg-brand-100/70" : selected.has(s.id) ? "bg-brand-50" : "even:bg-gray-50/60"
              }`}
            >
              <td className="w-14 min-w-14 py-3 pr-3 pl-4 align-top">{check(s)}</td>
              {/* 이름은 항상 한 줄 (영어 이름이 길어도) */}
              <td className="py-3 pr-4 align-top whitespace-nowrap">
                <Link
                  href={`/students/${s.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openPanel(e, s.id);
                  }}
                  className="font-semibold text-gray-900 hover:text-brand-700 hover:underline"
                >
                  {s.label}
                </Link>
                {!s.label.startsWith(s.name) && <span className="block text-xs text-gray-400">{s.name}</span>}
              </td>
              <td className="py-3 pr-4 align-top whitespace-nowrap">{remaining(s)}</td>
              <td className="py-3 pr-4 align-top whitespace-nowrap">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700">
                  {format(t.minutesUnit, { n: s.lesson_minutes })}
                </span>
              </td>
              {noteCell(s.privateNote, s.privateNoteT)}
              {noteCell(s.sharedNote, s.sharedNoteT)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {/* 넓은 PC: 왼쪽 목록 + 오른쪽 옆 칸 / 그보다 좁으면 옆 칸은 아래에서 올라오는 창 */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-4">
        <div className="min-w-0">
          <div className="mt-3 flex items-center gap-2">
            <label className="relative block flex-1">
              <span className="sr-only">{t.search}</span>
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                className="min-h-12 w-full rounded-xl border border-gray-300 pr-3 pl-10 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              />
            </label>
            {/* 노트 번역 ↔ 원문 */}
            {hasTranslation && (
              <button
                type="button"
                onClick={() => setOriginal((v) => !v)}
                aria-pressed={!original}
                className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium ${
                  original ? "border-gray-300 bg-white text-gray-700" : "border-brand-300 bg-brand-50 text-brand-700"
                }`}
              >
                🌐 <span className="hidden sm:inline">{original ? t.showTranslated : t.showOriginal}</span>
              </button>
            )}
            {/* 폰: 전체 선택 (PC는 표 머리글의 체크박스) */}
            <label className="flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm md:hidden">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="size-5 accent-brand-600" />
              {t.selectAll}
            </label>
          </div>

          {message && (
            <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}

          {shown.length === 0 ? (
            <p className="mt-8 text-center text-gray-500">{t.noMatch}</p>
          ) : (
            <div className={`mt-4 ${selected.size ? "pb-24" : ""}`}>
              {main.length > 0 && (
                <>
                  {cards(main)}
                  {table(main, true)}
                </>
              )}
              {zero.length > 0 && (
                <section className="mt-6">
                  <h2 className="font-bold text-gray-700">
                    {t.zeroTitle} <span className="font-normal text-gray-500">({zero.length})</span>
                  </h2>
                  <p className="mt-0.5 mb-2 text-sm text-gray-500">{format(t.zeroHint, { days: autoArchiveDays })}</p>
                  {cards(zero)}
                  {table(zero, main.length === 0)}
                </section>
              )}
            </div>
          )}
        </div>
        <StudentPanel
          studentId={openId}
          version={version}
          onClose={() => setOpenId(null)}
          onChanged={changed}
          t={panel.t}
          locale={panel.locale}
          timeZone={panel.timeZone}
          hoursBefore={panel.hoursBefore}
        />
      </div>

      {/* 고른 학생이 있으면 아래에 처리 줄 (폰은 하단 메뉴 바로 위) */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 md:bottom-4">
          <div className="mx-auto flex max-w-4xl items-center gap-1.5 rounded-2xl bg-gray-900 p-2 pl-4 text-white shadow-xl md:gap-2">
            <span className="mr-auto text-sm font-semibold">{format(t.selectedCount, { n: selected.size })}</span>
            <button type="button" disabled={pending} onClick={archive} className="min-h-11 rounded-xl bg-white/15 px-3 text-sm font-medium hover:bg-white/25 disabled:opacity-60">
              📦 {archivedView ? t.unarchiveSelected : t.archiveSelected}
            </button>
            <button type="button" disabled={pending} onClick={remove} className="min-h-11 rounded-xl bg-red-600 px-3 text-sm font-medium hover:bg-red-700 disabled:opacity-60">
              🗑️ {t.deleteSelected}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setSelected(new Set())}
              aria-label={t.clearSelection}
              className="min-h-11 min-w-11 rounded-xl px-2 text-sm text-gray-300 hover:bg-white/10 md:px-3"
            >
              <span aria-hidden className="md:hidden">✕</span>
              <span className="hidden md:inline">{t.clearSelection}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
