// 피드백 종류별 아이콘·색 (목록·폼 공용)
export const kindIcon = { good: "👍", improve: "✏️", note: "📌" } as const;
export const kindStyle = {
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  improve: "bg-amber-50 text-amber-900 border-amber-200",
  note: "bg-brand-50 text-brand-800 border-brand-200",
} as const;
