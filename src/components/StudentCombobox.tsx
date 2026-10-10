"use client";

import { useId, useRef, useState } from "react";
import { matchesSearch } from "@/lib/search";
import { fieldClass } from "@/components/PlanForm";

type Student = { id: string; name: string };

type Props = {
  students: Student[];
  value: string; // 고른 학생 id ("" = 아직 안 고름)
  onChange: (id: string) => void;
  name: string; // 폼으로 보낼 이름 (예: student_id)
  placeholder: string; // "이름 검색 (초성도 가능)"
  noMatch: string; // "찾는 학생이 없습니다"
  invalid?: boolean;
};

// 학생 고르기: 입력칸에 이름 일부나 초성을 치면 후보가 걸러짐. ↑↓ 로 이동, Enter 로 선택
export default function StudentCombobox({ students, value, onChange, name, placeholder, noMatch, invalid }: Props) {
  const selected = students.find((s) => s.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);

  // 고른 학생 이름이 그대로 있으면 전체 목록을 보여 줌 (다른 학생으로 바꾸기 쉽게)
  const filter = selected && query === selected.name ? "" : query;
  const matches = students.filter((s) => matchesSearch(s.name, filter));

  const choose = (s: Student) => {
    onChange(s.id);
    setQuery(s.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onBlur={() => {
          // 목록을 누르는 동안은 닫지 않도록 살짝 늦게
          setTimeout(() => {
            setOpen(false);
            setQuery(students.find((s) => s.id === value)?.name ?? "");
          }, 150);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault(); // 폼이 바로 제출되지 않게
            choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${fieldClass} pr-9`}
      />
      <span aria-hidden className="pointer-events-none absolute right-3 bottom-3.5 text-gray-400">
        🔍
      </span>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-sm text-gray-500">{noMatch}</li>
          ) : (
            matches.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={s.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between px-3 text-base ${
                  i === active ? "bg-brand-50" : ""
                } ${s.id === value ? "font-semibold text-brand-700" : ""}`}
              >
                {s.name}
                {s.id === value && <span aria-hidden>✓</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
