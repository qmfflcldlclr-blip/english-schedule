-- 대시보드에서 두 계정을 만든 "다음에" 실행 (SQL Editor 에 붙여 넣고 Run)
-- 로그인 계정과 사용자 정보(이름·역할·언어·시간대)를 연결합니다.
-- 이름(display_name)은 나중에 이 표에서 바로 고쳐도 됩니다.

insert into public.profiles (id, username, display_name, role, locale, timezone)
select id, 'lee', 'Lee', 'manager', 'ko', 'Asia/Seoul'
from auth.users where email = 'lee@example.com';

insert into public.profiles (id, username, display_name, role, locale, timezone)
select id, 'michelle', 'Michelle', 'teacher', 'en', 'Asia/Manila'
from auth.users where email = 'michelle@example.com';

-- 결과 확인: 2줄이 나오면 성공
select username, display_name, role, locale, timezone from public.profiles;
