-- 학생 "삭제" = 화면에서만 숨김 (지난 수업·횟수 기록·피드백은 데이터베이스에 그대로)
-- SQL Editor 에 붙여 넣고 Run, 한 번만 (0019 다음). 새 화면을 올리기 전에 먼저 실행
--
-- 바뀌는 것
--  1) students.deleted_at: 값이 있으면 삭제된 학생 (학생 목록·검색·고르기에서 안 보임)
--  2) 학생 삭제 함수: 기록은 남기고 숨김 + 앞으로 잡힌 예정 수업만 지움
--     예전 "영구 삭제" 함수(delete_students_permanently)는 없앰 → 화면에서 실수로 기록을 지울 수 없음

begin;

alter table public.students add column if not exists deleted_at timestamptz;

create or replace function public.remove_students(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;

  -- 아직 안 한(앞으로 잡힌) 수업만 지움. 지난 수업은 달력·인쇄 기록으로 남김
  delete from public.lessons
  where student_id = any(p_ids) and status = 'scheduled' and starts_at > now();

  update public.students
  set deleted_at = now(), archived = true
  where id = any(p_ids) and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.remove_students(uuid[]) from public, anon;
grant execute on function public.remove_students(uuid[]) to authenticated;

drop function if exists public.delete_students_permanently(uuid[]);

commit;

-- 확인: remove_students 가 보이고 delete_students_permanently 는 안 보이면 성공
select proname from pg_proc where proname in ('remove_students', 'delete_students_permanently');
