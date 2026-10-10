"use client";

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
