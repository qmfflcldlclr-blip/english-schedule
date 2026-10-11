-- 수업 길이에 따라 횟수 차감 (30분 = 1회, 15분 = 0.5회, 45분 = 1.5회, 60분 = 2회)
-- + 플랜·조정도 0.5회 단위 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0017 다음)
-- 이미 처리된 기록은 그대로 두고, 이 SQL 실행 뒤에 처리하는 수업부터 새 규칙이 적용됨
-- 중간에 오류가 나면 아무것도 바뀌지 않음

begin;

-- 1) 기준 길이 설정 (규칙 값은 설정 표 한 곳에)
insert into public.app_settings (key, value) values ('credit_base_minutes', '30')
on conflict (key) do nothing;

-- 2) 횟수 칸을 소수(0.5 단위)로. 남은 횟수 보기(view)는 이 칸을 쓰므로 지웠다가 다시 만듦
drop view if exists public.student_balances;

alter table public.credit_entries alter column delta type numeric(7, 1);
alter table public.credit_entries add constraint credit_entries_half_step check (delta * 2 = trunc(delta * 2));

alter table public.plans alter column credits type numeric(7, 1);
alter table public.plans add constraint plans_half_step check (credits * 2 = trunc(credits * 2));

create view public.student_balances
  with (security_invoker = true) as
select
  s.id as student_id,
  coalesce(sum(e.delta), 0)::numeric(7, 1) as remaining,
  coalesce(-sum(e.delta) filter (where e.kind <> 'plan'), 0)::numeric(7, 1) as used
from public.students s
left join public.credit_entries e on e.student_id = s.id
group by s.id;

grant select on public.student_balances to authenticated;

-- 3) 수업 1개가 몇 회인지: 길이 ÷ 기준 길이, 0.5회 단위로 반올림 (최소 0.5회)
create or replace function public.lesson_credit_units(p_minutes integer)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0.5, round(p_minutes * 2.0 / coalesce(public.setting_text('credit_base_minutes')::numeric, 30)) / 2);
$$;

revoke execute on function public.lesson_credit_units(integer) from public, anon;
grant execute on function public.lesson_credit_units(integer) to authenticated;

-- 4) 수업 상태 변경: 완료·결석·차감 취소 때 수업 길이만큼 차감 (나머지는 0007 과 같음)
create or replace function public.set_lesson_status(
  p_lesson_id uuid,
  p_action text,
  p_cancelled_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons;
  v_me uuid := auth.uid();
  v_cancelled_at timestamptz := coalesce(p_cancelled_at, now());
  v_free boolean;
  v_reason text;
  v_net numeric;
  v_units numeric;
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'lesson_not_found';
  end if;

  -- 같은 학생의 처리는 한 번에 하나씩 (동시에 두 취소가 모두 "첫 취소"가 되는 일 방지)
  perform pg_advisory_xact_lock(hashtext(v_lesson.student_id::text));

  if p_action in ('complete', 'absent', 'cancel') and v_lesson.status <> 'scheduled' then
    raise exception 'already_processed';
  end if;

  v_units := public.lesson_credit_units(v_lesson.duration_minutes);

  if p_action = 'complete' then
    update public.lessons set status = 'completed' where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, created_by)
    values (v_lesson.student_id, -v_units, 'lesson_completed', v_lesson.id, v_me);
    return 'completed';

  elsif p_action = 'absent' then
    update public.lessons set status = 'absent', cancelled_at = null where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, created_by)
    values (v_lesson.student_id, -v_units, 'absent', v_lesson.id, v_me);
    return 'absent';

  elsif p_action = 'cancel' then
    if v_cancelled_at > now() + interval '1 minute' then
      raise exception 'cancel_time_in_future';
    end if;
    select p.free, p.reason into v_free, v_reason
    from public.preview_cancel(v_lesson.id, v_cancelled_at) p;

    if v_free then
      update public.lessons set status = 'free_cancel', cancelled_at = v_cancelled_at where id = v_lesson.id;
      insert into public.credit_entries (student_id, delta, kind, lesson_id, detail, created_by)
      values (v_lesson.student_id, 0, 'free_cancel', v_lesson.id, v_reason, v_me);
      return 'free_cancel';
    else
      update public.lessons set status = 'absent', cancelled_at = v_cancelled_at where id = v_lesson.id;
      insert into public.credit_entries (student_id, delta, kind, lesson_id, detail, created_by)
      values (v_lesson.student_id, -v_units, 'late_cancel', v_lesson.id, v_reason, v_me);
      return 'absent';
    end if;

  elsif p_action = 'revert' then
    if v_lesson.status = 'scheduled' then
      raise exception 'not_processed';
    end if;
    -- 이 수업 때문에 늘거나 준 횟수를 모두 되돌림 (예전 규칙으로 처리된 수업도 실제 기록대로 정확히 되돌림)
    select coalesce(sum(delta), 0) into v_net
    from public.credit_entries where lesson_id = v_lesson.id;
    update public.lessons set status = 'scheduled', cancelled_at = null where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, detail, created_by)
    values (v_lesson.student_id, -v_net, 'revert', v_lesson.id, v_lesson.status, v_me);
    return 'scheduled';

  else
    raise exception 'unknown_action';
  end if;
end;
$$;

commit;

-- 확인: 15·30·45·60분 → 0.5 / 1 / 1.5 / 2 가 나오면 성공
select m as 분, public.lesson_credit_units(m) as 횟수 from unnest(array[15, 30, 45, 60]) as m;
