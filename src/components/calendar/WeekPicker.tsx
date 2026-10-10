"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

// 주 제목을 누르면 날짜 선택기가 떠서, 고른 날짜가 있는 주로 이동
export default function WeekPicker({ label, value, ariaLabel }: { label: string; value: string; ariaLabel: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          const el = input.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus(); // 선택기를 직접 못 여는 브라우저
          }
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-lg font-semibold hover:bg-brand-50"
      >
        <span aria-hidden>📅</span>
        {label}
        <span aria-hidden className="text-sm text-gray-400">▾</span>
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(e) => e.target.value && router.push(`/calendar?date=${e.target.value}`)}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
      />
    </span>
  );
}
