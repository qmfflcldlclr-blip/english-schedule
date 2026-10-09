-- 수업 일정 표 (SQL Editor 에 붙여 넣고 Run, 한 번만. 0005 를 먼저 실행)

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  starts_at timestamptz not null,                 -- 시작 시각 (UTC 로 저장, 화면에서 각자 시간대로 표시)
  duration_minutes integer not null
    check (duration_minutes between 10 and 180),
  status text not null default 'scheduled' check (status in (
    'scheduled',    -- 예정
    'completed',    -- 완료 (−1)
    'free_cancel',  -- 무료 취소 (0)
    'absent'        -- 결석·차감 취소 (−1)
  )),
  series_id uuid,                                 -- 반복으로 함께 만든 수업 묶음 (없으면 단독 수업)
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) default auth.uid()
);

create index on public.lessons (starts_at);
create index on public.lessons (student_id, starts_at);
create index on public.lessons (series_id) where series_id is not null;

-- 횟수 기록과 수업 연결 (5단계에서 사용)
alter table public.credit_entries
  add constraint credit_entries_lesson_id_fkey
  foreign key (lesson_id) references public.lessons (id);

alter table public.lessons enable row level security;

create policy "직원은 수업 조회 가능" on public.lessons
  for select to authenticated using ((select public.is_staff()));

-- 새 수업은 항상 "예정" 상태로, 등록한 사람은 본인으로
create policy "직원은 수업 추가 가능" on public.lessons
  for insert to authenticated
  with check (
    (select public.is_staff())
    and created_by = (select auth.uid())
    and status = 'scheduled'
  );

-- "예정" 수업만 시간·학생·길이·메모 수정 가능 (완료·결석된 수업은 기록 보호를 위해 고정)
create policy "직원은 예정 수업 수정 가능" on public.lessons
  for update to authenticated
  using ((select public.is_staff()) and status = 'scheduled')
  with check ((select public.is_staff()) and status = 'scheduled');

-- "예정" 수업만 삭제 가능
create policy "직원은 예정 수업 삭제 가능" on public.lessons
  for delete to authenticated
  using ((select public.is_staff()) and status = 'scheduled');

-- 상태(완료·취소·결석)는 화면에서 직접 못 바꿈 → 5단계의 규칙 함수로만 변경
revoke update on public.lessons from authenticated, anon;
grant update (student_id, starts_at, duration_minutes, memo) on public.lessons to authenticated;
