import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// 로그인 없이 들어갈 수 있는 주소
const PUBLIC_PATHS = ["/login"];

// 모든 요청 전에 실행: 로그인 상태를 갱신하고, 로그인 안 했으면 로그인 화면으로 보냄
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // 중요: 이 호출이 로그인 세션을 갱신함 (지우면 무작위로 로그아웃될 수 있음)
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!loggedIn && !isPublic) {
    return redirectKeepingCookies(request, "/login", response);
  }
  if (loggedIn && pathname.startsWith("/login")) {
    return redirectKeepingCookies(request, "/", response);
  }
  return response;
}

// 다른 주소로 보낼 때도 갱신된 로그인 쿠키를 잃지 않도록 복사
function redirectKeepingCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // 이미지·스크립트 같은 정적 파일은 검사하지 않음
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
