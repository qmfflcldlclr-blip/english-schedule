// 피드백 종류별 아이콘·색 (목록·폼 공용)
export const kindIcon = { good: "👍", improve: "✏️", note: "📌" } as const;
export const kindStyle = {
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  improve: "bg-amber-50 text-amber-900 border-amber-200",
  note: "bg-brand-50 text-brand-800 border-brand-200",
} as const;

// 복사할 글 만들기 (목록·달력 옆 칸 공용)
export function feedbackCopyText(p: { studentName: string; lessonLabel: string | null; icon: string; kind: string; text: string }) {
  const head = p.lessonLabel ? `[${p.studentName} · ${p.lessonLabel}]` : `[${p.studentName}]`;
  return `${head}\n${p.icon} ${p.kind}: ${p.text}`;
}
