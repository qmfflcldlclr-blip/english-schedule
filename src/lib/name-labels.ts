// 동명이인 표시 (서버·브라우저 공용): 같은 이름이 둘 이상이면 등록 순서대로 "김민준 #1", "김민준 #2"
// 보관된 학생도 함께 세서, 누군가 보관돼도 번호가 바뀌지 않음

export type NameRow = { id: string; name: string; created_at: string };

export function computeNameLabels(rows: NameRow[]): Map<string, string> {
  const key = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const total = new Map<string, number>();
  for (const r of sorted) total.set(key(r.name), (total.get(key(r.name)) ?? 0) + 1);

  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const r of sorted) {
    const k = key(r.name);
    if ((total.get(k) ?? 0) < 2) {
      labels.set(r.id, r.name);
      continue;
    }
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    labels.set(r.id, `${r.name} #${n}`);
  }
  return labels;
}
