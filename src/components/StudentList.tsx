"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "@/i18n/format";
import { matchesSearch } from "@/lib/search";

export type StudentRow = {
  id: string;
  name: string;
  memo: string | null;
  lesson_minutes: number;
  remaining: number;
  expired: boolean;
};

type Props = {
  students: StudentRow[];
  t: {
    search: string;
    noMatch: string;
    name: string;
    remaining: string;
    lessonMinutes: string;
    memo: string;
    minutesUnit: string; // "{n}분"
    timesUnit: string; // "{n}회"
    expired: string;
  };
};

// 학생 목록 + 검색 (이름·메모, 초성 가능). 폰은 카드, PC는 표
export default function StudentList({ students, t }: Props) {
  const [query, setQuery] = useState("");
  const shown = students.filter((s) => matchesSearch(`${s.name} ${s.memo ?? ""}`, query));

  // 남은 횟수 + "기간 지남" 표시 (0회 이하면 빨간색)
  const Remaining = ({ s }: { s: StudentRow }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-semibold tabular-nums ${s.remaining <= 0 ? "text-red-600" : ""}`}>
        {format(t.timesUnit, { n: s.remaining })}
      </span>
      {s.expired && (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{t.expired}</span>
      )}
    </span>
  );

  return (
    <>
      <label className="relative mt-3 block">
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

      {shown.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">{t.noMatch}</p>
      ) : (
        <>
          {/* 폰: 카드형 목록 */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {shown.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name}</p>
                    {s.memo && <p className="truncate text-sm text-gray-500">{s.memo}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <Remaining s={s} />
                    <p className="text-xs text-gray-500">{format(t.minutesUnit, { n: s.lesson_minutes })}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* PC: 표 */}
          <table className="mt-4 hidden w-full rounded-2xl bg-white text-left shadow-sm md:table">
            <thead className="border-b border-gray-200 text-sm text-gray-500">
              <tr>
                <th className="py-2 pr-4 pl-4 font-medium">{t.name}</th>
                <th className="py-2 pr-4 font-medium">{t.remaining}</th>
                <th className="py-2 pr-4 font-medium">{t.lessonMinutes}</th>
                <th className="py-2 pr-4 font-medium">{t.memo}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 pr-4 pl-4">
                    <Link href={`/students/${s.id}`} className="font-semibold hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <Remaining s={s} />
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{format(t.minutesUnit, { n: s.lesson_minutes })}</td>
                  <td className="max-w-md truncate py-3 pr-4 text-gray-500">{s.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
