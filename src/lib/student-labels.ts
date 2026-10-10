import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { computeNameLabels } from "@/lib/name-labels";

// 학생 id → 화면 표시 이름 (동명이인은 #1, #2). 한 화면을 그리는 동안 한 번만 조회
export const getStudentLabels = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id, name, created_at");
  return computeNameLabels(data ?? []);
});
