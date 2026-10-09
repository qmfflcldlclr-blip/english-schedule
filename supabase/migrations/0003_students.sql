-- 학생 표 (Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run)

-- 지금 로그인한 사람이 매니저·선생님인지 확인하는 함수 (여러 표의 보안 규칙에서 재사용)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('manager', 'teacher')
  );
$$;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  lesson_minutes integer not null default 30
    check (lesson_minutes between 10 and 180),  -- 수업 길이(분)
  memo text,
  archived boolean not null default false,      -- 보관(목록에서 숨김). 기록 보존을 위해 삭제 대신 사용
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) default auth.uid()
);

alter table public.students enable row level security;

-- 매니저·선생님만 조회·추가·수정 가능 (나중에 학생 로그인이 생겨도 다른 학생 정보는 못 봄)
create policy "직원은 학생 조회 가능"
  on public.students for select to authenticated
  using ((select public.is_staff()));

create policy "직원은 학생 추가 가능"
  on public.students for insert to authenticated
  with check ((select public.is_staff()));

create policy "직원은 학생 수정 가능"
  on public.students for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- 삭제는 허용하지 않음 (보관 기능 사용)
revoke delete on public.students from authenticated, anon;
-- 만든 사람·만든 시각은 바꿀 수 없게
revoke update on public.students from authenticated, anon;
grant update (name, lesson_minutes, memo, archived) on public.students to authenticated;
