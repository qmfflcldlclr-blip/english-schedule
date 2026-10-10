-- 학생 피드백 (잘한 점 / 고칠 점 / 메모) — SQL Editor 에 붙여 넣고 Run, 한 번만

create table public.student_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  kind text not null check (kind in ('good', 'improve', 'note')), -- 👍 잘한 점 / ✏️ 고칠 점 / 📌 메모
  content text not null check (length(trim(content)) between 1 and 2000),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_feedback_student_idx on public.student_feedback (student_id, created_at desc);
create index student_feedback_created_idx on public.student_feedback (created_at desc);

alter table public.student_feedback enable row level security;

-- 매니저·선생님은 모든 피드백을 볼 수 있음
create policy "직원은 피드백 조회 가능"
  on public.student_feedback for select to authenticated
  using ((select public.is_staff()));

-- 쓴 사람은 항상 본인으로 기록
create policy "직원은 피드백 작성 가능"
  on public.student_feedback for insert to authenticated
  with check ((select public.is_staff()) and created_by = (select auth.uid()));

-- 고치기·지우기는 쓴 사람만
create policy "작성자만 피드백 수정 가능"
  on public.student_feedback for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "작성자만 피드백 삭제 가능"
  on public.student_feedback for delete to authenticated
  using (created_by = (select auth.uid()));

-- 고칠 수 있는 칸은 종류·내용뿐 (학생·작성자·작성 시각은 고정, 수정 시각은 트리거가 기록)
revoke insert, update on public.student_feedback from authenticated, anon;
grant insert (student_id, kind, content) on public.student_feedback to authenticated;
grant update (kind, content) on public.student_feedback to authenticated;

create or replace function public.touch_student_feedback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger student_feedback_touch
  before update on public.student_feedback
  for each row execute function public.touch_student_feedback();

-- 확인: 0 이 나오면 성공 (아직 피드백 없음)
select count(*) from public.student_feedback;
