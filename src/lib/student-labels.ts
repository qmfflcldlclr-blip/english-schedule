import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { computeNameLabels } from "@/lib/name-labels";
import { romanizeName } from "@/lib/romanize";

// 학생 id → 화면 표시 이름 (동명이인은 #1, #2). 한 화면을 그리는 동안 한 번만 조회
// 영어 화면이면 영어 이름(비어 있으면 한글 이름을 자동 로마자 변환)으로 보여 줌. 동명이인 판단은 한글 이름 기준
export const getStudentLabels = cache(async () => {
  const supabase = await createClient();
  // "*" 로 가져와서, 영어 이름 칸(0013)을 아직 안 만들었어도 화면이 깨지지 않게
  const [{ data }, locale] = await Promise.all([supabase.from("students").select("*"), getLocale()]);
  // 삭제된 학생(0020)은 동명이인 번호에서 뺌 (지난 수업에는 원래 이름으로 보임)
  const rows = ((data ?? []) as { id: string; name: string; name_en?: string | null; created_at: string; deleted_at?: string | null }[]).filter(
    (r) => !r.deleted_at,
  );
  return computeNameLabels(rows, locale === "en" ? (r) => r.name_en?.trim() || romanizeName(r.name) : undefined);
});
