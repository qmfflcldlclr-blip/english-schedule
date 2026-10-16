-- 0.5회 폐지(30분 = 1회, 60분 = 2회, 90분 = 3회) + 연기 규칙 변경 + 플랜 횟수 바꾸기
-- SQL Editor 에 붙여 넣고 Run, 한 번만 (0018 다음). 중간에 오류가 나면 아무것도 바뀌지 않음
--
-- 바뀌는 것
--  1) 수업 1개 = 길이 ÷ 30분 (정수, 최소 1회)
--  2) 취소 = "연기": 선생님·매니저가 직접 고를 때만, 언제나 차감 없음 (1시간 전·월 1회 자동 판단 없앰)
--     차감되는 취소는 "결석"으로 처리
--  3) 플랜 횟수 바꾸기 (예: 4회 → 12회). 차이만큼 플랜 기록이 자동으로 한 줄 더 생김
--  4) 30분 단위가 아닌 예정 수업·학생 기본 길이를 30분 단위로 올림 (15분 → 30분)
--  5) 남은 횟수에 0.5가 남은 학생은 반올림 조정 1줄 (예: 3.5 → 4)

begin;

-- 1) 수업 1개가 몇 회인지 (정수)
create or replace function public.lesson_credit_units(p_minutes integer)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1, round(p_minutes::numeric / coalesce(public.setting_text('credit_base_minutes')::numeric, 30)));
$$;

-- 2) 수업 상태 변경: 'cancel' = 연기 (언제나 차감 없음). 나머지는 0018 과 같음
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
    update public.lessons set status = 'free_cancel', cancelled_at = coalesce(p_cancelled_at, now()) where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, detail, created_by)
    values (v_lesson.student_id, 0, 'free_cancel', v_lesson.id, 'postponed', v_me);
    return 'free_cancel';

  elsif p_action = 'revert' then
    if v_lesson.status = 'scheduled' then
      raise exception 'not_processed';
    end if;
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

-- 3) 플랜 횟수 바꾸기: 플랜 표의 횟수 + 차이만큼 플랜 기록 (화면에서 직접 횟수를 고칠 수는 없음)
create or replace function public.change_plan_credits(p_plan_id uuid, p_credits integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;
  if p_credits is null or p_credits < 1 then
    raise exception 'bad_credits';
  end if;

  select * into v_plan from public.plans where id = p_plan_id for update;
  if not found then
    raise exception 'plan_not_found';
  end if;
  if v_plan.credits = p_credits then
    return;
  end if;

  update public.plans set credits = p_credits where id = v_plan.id;
  insert into public.credit_entries (student_id, delta, kind, plan_id, reason, created_by)
  values (v_plan.student_id, p_credits - v_plan.credits, 'plan', v_plan.id,
          v_plan.credits::integer || '회 → ' || p_credits || '회', auth.uid());
end;
$$;

revoke execute on function public.change_plan_credits(uuid, integer) from public, anon;
grant execute on function public.change_plan_credits(uuid, integer) to authenticated;

-- 새 플랜은 정수 횟수만 (예전 기록은 검사하지 않음)
alter table public.plans add constraint plans_whole_credits check (credits = trunc(credits)) not valid;

-- 4) 30분 단위로 올림: 아직 안 한 수업 + 학생 기본 길이 (최대 90분)
update public.lessons
set duration_minutes = least(90, ceil(duration_minutes / 30.0) * 30)
where status = 'scheduled' and duration_minutes % 30 <> 0;

update public.students
set lesson_minutes = least(90, ceil(lesson_minutes / 30.0) * 30)
where lesson_minutes % 30 <> 0;

-- 5) 남은 횟수 0.5 정리 (반올림). 처리한 사람 = 매니저
insert into public.credit_entries (student_id, delta, kind, reason, created_by)
select b.student_id, round(b.remaining) - b.remaining, 'adjust', '0.5회 폐지: 반올림',
       (select id from public.profiles where role = 'manager' order by created_at limit 1)
from public.student_balances b
where b.remaining <> trunc(b.remaining);

commit;

-- 확인: 30·60·90분 → 1 / 2 / 3, 소수로 남은 학생 0명
select m as 분, public.lesson_credit_units(m) as 횟수 from unnest(array[30, 60, 90]) as m;
select count(*) as 소수_남은_학생 from public.student_balances where remaining <> trunc(remaining);
