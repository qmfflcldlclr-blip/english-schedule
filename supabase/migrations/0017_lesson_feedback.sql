-- 수업별 피드백: 피드백에 "어느 수업"인지 연결 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0016 다음)
-- 수업 없이 쓰는 일반 피드백도 그대로 가능 (lesson_id 비움)

alter table public.student_feedback
  add column if not exists lesson_id uuid references public.lessons (id) on delete set null;
create index if not exists student_feedback_lesson_idx on public.student_feedback (lesson_id) where lesson_id is not null;

-- 쓸 때 수업도 고를 수 있게 (고칠 때는 종류·내용만 — 0010 그대로)
grant insert (lesson_id) on public.student_feedback to authenticated;

-- 수업과 학생이 서로 맞는지 확인 (다른 학생의 수업에 붙이는 실수 방지)
create or replace function public.check_feedback_lesson()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lesson_id is not null and not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.student_id = new.student_id
  ) then
    raise exception 'lesson_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists student_feedback_check_lesson on public.student_feedback;
create trigger student_feedback_check_lesson
  before insert or update of lesson_id on public.student_feedback
  for each row execute function public.check_feedback_lesson();

-- 확인: lesson_id 가 보이면 성공
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'student_feedback' and column_name = 'lesson_id';
