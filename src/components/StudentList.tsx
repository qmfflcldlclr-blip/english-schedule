"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "@/i18n/format";
import type { Messages } from "@/i18n/server";
import { matchesSearch } from "@/lib/search";
import { archiveStudents, deleteStudentsPermanently, type BulkResult } from "@/lib/student-actions";

export type StudentRow = {
  id: string;
  name: string;
  label: string; // 동명이인은 "김민준 #2"
  memo: string | null;
  lesson_minutes: number;
  remaining: number;
  expired: boolean;
};

type Props = {
  students: StudentRow[];
  archivedView: boolean; // 보관된 학생 목록이면 true
  autoArchiveDays: number;
  t: Messages["students"] & { timesUnit: string; expired: string };
};

// 학생 목록: 검색(이름·메모, 초성) + 체크박스로 여러 명 보관·완전 삭제
// 현재 학생 목록에서는 남은 횟수 0회 학생을 맨 아래 묶음으로 따로 보여 줌
export default function StudentList({ students, archivedView, autoArchiveDays, t }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = students.filter((s) => matchesSearch(`${s.label} ${s.memo ?? ""}`, query));
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

  // 남은 횟수 + "기간 지남" 표시 (0회 이하면 빨간색)
  const remaining = (s: StudentRow) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-semibold tabular-nums ${s.remaining <= 0 ? "text-red-600" : ""}`}>
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
            className={`flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm active:bg-gray-50 ${
              selected.has(s.id) ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{s.label}</p>
              {s.memo && <p className="truncate text-sm text-gray-500">{s.memo}</p>}
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

  // PC: 표
  const table = (rows: StudentRow[], withHeader: boolean) => (
    <table className="hidden w-full rounded-2xl bg-white text-left shadow-sm md:table">
      {withHeader && (
        <thead className="border-b border-gray-200 text-sm text-gray-500">
          <tr>
            <th className="w-12 py-2 pl-4">
              <input
                type="checkbox"
                checked={allShownSelected}
                onChange={toggleAll}
                aria-label={t.selectAll}
                className="size-5 cursor-pointer accent-brand-600"
              />
            </th>
            <th className="py-2 pr-4 font-medium">{t.name}</th>
            <th className="py-2 pr-4 font-medium">{t.remaining}</th>
            <th className="py-2 pr-4 font-medium">{t.lessonMinutes}</th>
            <th className="py-2 pr-4 font-medium">{t.memo}</th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((s) => (
          <tr
            key={s.id}
            className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${selected.has(s.id) ? "bg-brand-50/60" : ""}`}
          >
            <td className="w-12 py-3 pl-4">
              {check(s)}
            </td>
            <td className="py-3 pr-4">
              <Link href={`/students/${s.id}`} className="font-semibold hover:underline">
                {s.label}
              </Link>
            </td>
            <td className="w-40 py-3 pr-4">
              {remaining(s)}
            </td>
            <td className="w-28 py-3 pr-4 text-gray-600">{format(t.minutesUnit, { n: s.lesson_minutes })}</td>
            <td className="max-w-md truncate py-3 pr-4 text-gray-500">{s.memo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
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
