-- 수강 플랜 + 횟수 기록(통장) (Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run, 한 번만)

-- 1) 수강 플랜: 결제할 때마다 1줄
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  credits integer not null check (credits > 0),  -- 등록 횟수 (매번 직접 입력)
  paid_on date not null,                          -- 결제일
  starts_on date not null,                        -- 시작일
  expires_on date,                                -- 만료일 (비우면 기간 없음)
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) default auth.uid(),
  check (expires_on is null or expires_on >= starts_on)
);

-- 2) 횟수 기록: 늘거나 줄 때마다 1줄. 남은 횟수 = 이 학생 기록의 delta 합계
create table public.credit_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  delta integer not null,                         -- +10, -1, 0 ...
  kind text not null check (kind in (
    'plan',              -- 플랜 등록 (+N, 자동 기록)
    'lesson_completed',  -- 수업 완료 (-1)        ← 5단계에서 사용
    'absent',            -- 결석 (-1)             ← 5단계에서 사용
    'late_cancel',       -- 차감 취소 (-1)        ← 5단계에서 사용
    'free_cancel',       -- 무료 취소 (0, 근거용)  ← 5단계에서 사용
    'adjust'             -- 수동 조정 (±N)
  )),
  plan_id uuid references public.plans (id),
  lesson_id uuid,                                 -- 5단계에서 수업 표와 연결
  reason text,                                    -- 수동 조정 사유
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) default auth.uid(),
  -- 수동 조정은 사유 필수, 0회 조정은 불가
  check (kind <> 'adjust' or (delta <> 0 and length(trim(coalesce(reason, ''))) > 0))
);

create index on public.plans (student_id);
create index on public.credit_entries (student_id, created_at);

-- 3) 플랜을 등록하면 횟수 기록에 +N 이 자동으로 함께 들어감 (둘 중 하나만 저장되는 일 없음)
create or replace function public.record_plan_credits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.credit_entries (student_id, delta, kind, plan_id, created_by)
  values (new.student_id, new.credits, 'plan', new.id, new.created_by);
  return new;
end;
$$;

create trigger plans_record_credits
  after insert on public.plans
  for each row execute function public.record_plan_credits();

-- 4) 학생별 남은 횟수와 사용 횟수 (보는 사람의 권한 그대로 적용)
--    used = 플랜 등록을 제외한 증감의 합을 뒤집은 값 (수업·결석은 +, 보너스·정정은 −로 반영)
create view public.student_balances
  with (security_invoker = true) as
select
  s.id as student_id,
  coalesce(sum(e.delta), 0)::integer as remaining,
  coalesce(-sum(e.delta) filter (where e.kind <> 'plan'), 0)::integer as used
from public.students s
left join public.credit_entries e on e.student_id = s.id
group by s.id;

-- 5) 보안 규칙: 매니저·선생님만
alter table public.plans enable row level security;
alter table public.credit_entries enable row level security;

create policy "직원은 플랜 조회 가능" on public.plans
  for select to authenticated using ((select public.is_staff()));
-- 등록할 때 "처리한 사람"은 반드시 로그인한 본인 (다른 사람 이름으로 기록 불가)
create policy "직원은 플랜 등록 가능" on public.plans
  for insert to authenticated
  with check ((select public.is_staff()) and created_by = (select auth.uid()));
create policy "직원은 플랜 수정 가능" on public.plans
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "직원은 횟수 기록 조회 가능" on public.credit_entries
  for select to authenticated using ((select public.is_staff()));
create policy "직원은 횟수 기록 추가 가능" on public.credit_entries
  for insert to authenticated
  with check ((select public.is_staff()) and created_by = (select auth.uid()));

-- 플랜: 삭제 불가, 횟수·학생은 수정 불가 (만료일·메모·날짜만 수정 가능)
revoke update, delete on public.plans from authenticated, anon;
grant update (paid_on, starts_on, expires_on, memo) on public.plans to authenticated;

-- 횟수 기록: 추가만 가능, 수정·삭제 불가 (잘못된 기록은 정정 기록을 추가)
revoke update, delete on public.credit_entries from authenticated, anon;

-- 6) 학생 표(0003)도 같은 규칙 적용: 등록한 사람은 반드시 로그인한 본인
drop policy "직원은 학생 추가 가능" on public.students;
create policy "직원은 학생 추가 가능" on public.students
  for insert to authenticated
  with check ((select public.is_staff()) and created_by = (select auth.uid()));
