"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/supabase/config";

export type LoginState = { error?: "invalid" | "noProfile" };

// 로그인: 아이디를 내부 이메일로 바꿔 Supabase 에 확인 → 성공하면 그 사람의 기본 언어로 맞춤
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error || !data.user) return { error: "invalid" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", data.user.id)
    .single();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "noProfile" };
  }

  (await cookies()).set(LOCALE_COOKIE, profile.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
