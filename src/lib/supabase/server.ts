import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// 서버(페이지·서버 액션)에서 쓰는 Supabase 연결. 로그인 정보는 쿠키로 주고받음
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 페이지를 그리는 중에는 쿠키를 쓸 수 없음 → proxy.ts 가 대신 갱신하므로 무시
        }
      },
    },
  });
}

// 로그인한 사용자의 프로필 (로그인 안 했으면 null)
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, locale, timezone")
    .eq("id", userId)
    .single();
  return profile;
}
