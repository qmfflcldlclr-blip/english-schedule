"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// 학생 선택: 바꾸면 주소(?student=)를 바꿔서 다시 그림
export function StudentPicker({
  month,
  selected,
  students,
  label,
  allLabel,
}: {
  month: string;
  selected: string;
  students: { id: string; name: string }[];
  label: string;
  allLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      {label}
      <select
        value={selected}
        onChange={(e) => {
          const q = new URLSearchParams({ month });
          if (e.target.value) q.set("student", e.target.value);
          router.replace(`${pathname}?${q}`);
        }}
        className="min-h-11 rounded-xl border border-gray-300 px-3 text-base"
      >
        <option value="">{allLabel}</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-xl bg-brand-600 px-5 font-medium text-white"
    >
      🖨️ {label}
    </button>
  );
}

// 안전장치: 내용이 종이 높이를 넘으면 종이 전체를 그만큼 축소 (무조건 한 장)
export function FitToPage({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    i.style.zoom = "1";
    const ratio = o.clientHeight / i.scrollHeight;
    if (ratio < 1) i.style.zoom = String(Math.floor(ratio * 1000) / 1000);
  });
  return (
    <div ref={outer} className={className} style={style}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
