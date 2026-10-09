// Supabase 로그인은 이메일이 필요해서, 아이디를 "아이디@이 도메인" 형태로 바꿔서 사용
// example.com 은 누구도 소유할 수 없는 예약 도메인이라 실제 메일이 오가지 않음
export const LOGIN_EMAIL_DOMAIN = "example.com";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
