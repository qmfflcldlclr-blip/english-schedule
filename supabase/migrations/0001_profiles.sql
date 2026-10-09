-- 사용자 정보 표 (Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run)
-- 로그인 계정(auth.users) 1개당 이 표의 행 1개가 짝을 이룹니다.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,              -- 로그인 아이디 (예: michelle, lee)
  display_name text not null,                 -- 화면에 보이는 이름
  role text not null
    check (role in ('manager', 'teacher', 'student', 'parent')),  -- 학생·학부모는 추후 사용
  locale text not null default 'ko'
    check (locale in ('ko', 'en')),           -- 기본 화면 언어
  timezone text not null default 'Asia/Seoul', -- 시간 표시 기준
  created_at timestamptz not null default now()
);

-- 보안 규칙(RLS): 켜 두면 아래 정책으로 허락한 것만 가능
alter table public.profiles enable row level security;

-- 로그인한 사람은 사용자 목록을 볼 수 있음
create policy "로그인한 사용자는 프로필 조회 가능"
  on public.profiles for select
  to authenticated
  using (true);

-- 자기 프로필만 수정 가능 (예: 기본 언어 변경)
create policy "본인 프로필만 수정 가능"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 단, 고칠 수 있는 칸은 언어·시간대뿐 (역할·아이디를 스스로 바꾸는 것 방지)
revoke update on public.profiles from authenticated, anon;
grant update (locale, timezone) on public.profiles to authenticated;
