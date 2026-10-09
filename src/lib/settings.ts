import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// 데이터베이스 설정 표(app_settings)의 값 읽기. 규칙 값은 모두 이 표에 있음
export const getSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const map = new Map((data ?? []).map((row) => [row.key as string, row.value]));
  return {
    freeCancelHoursBefore: Number(map.get("free_cancel_hours_before") ?? 1),
    freeCancelsPerMonth: Number(map.get("free_cancels_per_month") ?? 1),
    businessTimeZone: String(map.get("business_time_zone") ?? "Asia/Seoul"),
    zoomUrl: (map.get("zoom_url") as string | undefined) ?? null,
  };
});
