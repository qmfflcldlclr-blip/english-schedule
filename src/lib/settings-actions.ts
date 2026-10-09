"use server";

import { createClient } from "@/lib/supabase/server";

export type ZoomFormState = { saved?: boolean; error?: "url" | "save" };

// Zoom 링크 저장. 비우면 링크 삭제
export async function saveZoomUrl(
  _prev: ZoomFormState,
  formData: FormData,
): Promise<ZoomFormState> {
  const raw = String(formData.get("zoom_url") ?? "").trim();
  let value: string | null = null;
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return { error: "url" };
      value = url.toString();
    } catch {
      return { error: "url" };
    }
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("app_settings")
    .update({ value, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("key", "zoom_url");
  if (error || !count) return { error: "save" };
  return { saved: true };
}
