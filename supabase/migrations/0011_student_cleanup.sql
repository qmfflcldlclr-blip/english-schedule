-- 학생 정리: 완전 삭제 + 자동 보관 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0010 다음에 실행)

-- ───────────────────────────────────────────────
-- 1) 완전 삭제: 고른 학생과 그 학생의 모든 기록(횟수 기록·수업·플랜·피드백)을 한 번에 영구 삭제
--    평소 기록 보호(삭제 금지)는 그대로 두고, 이 함수로만 지울 수 있음. 중간에 실패하면 아무것도 안 지워짐
-- ───────────────────────────────────────────────
create or replace function public.delete_students_permanently(p_ids uuid[])
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

  -- 서로 연결된 순서대로: 피드백 → 횟수 기록(수업·플랜을 가리킴) → 수업 → 플랜 → 학생
  if to_regclass('public.student_feedback') is not null then
    execute 'delete from public.student_feedback where student_id = any($1)' using p_ids;
  end if;
  delete from public.credit_entries where student_id = any(p_ids);
  delete from public.lessons where student_id = any(p_ids);
  delete from public.plans where student_id = any(p_ids);
  delete from public.students where id = any(p_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.delete_students_permanently(uuid[]) from public, anon;
grant execute on function public.delete_students_permanently(uuid[]) to authenticated;

-- ───────────────────────────────────────────────
-- 2) 자동 보관: 남은 횟수가 정확히 0회인 채로 p_days 일 동안 변화가 없고, 앞으로 잡힌 수업도 없는 학생
--    (마이너스 학생은 정산이 필요하니 제외, 기록이 하나도 없는 새 학생도 제외)
--    학생 목록을 열 때마다 화면이 호출함. 보관은 언제든 되돌릴 수 있음
-- ───────────────────────────────────────────────
create or replace function public.auto_archive_students(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    return 0;
  end if;

  update public.students s
  set archived = true
  where not s.archived
    and exists (select 1 from public.credit_entries e where e.student_id = s.id)
    and (select sum(e.delta) from public.credit_entries e where e.student_id = s.id) = 0
    and (select max(e.created_at) from public.credit_entries e where e.student_id = s.id)
        < now() - make_interval(days => greatest(p_days, 1))
    and not exists (
      select 1 from public.lessons l
      where l.student_id = s.id and l.status = 'scheduled' and l.starts_at > now()
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.auto_archive_students(integer) from public, anon;
grant execute on function public.auto_archive_students(integer) to authenticated;

-- 확인: 두 함수가 보이면 성공
select proname from pg_proc
where proname in ('delete_students_permanently', 'auto_archive_students');
