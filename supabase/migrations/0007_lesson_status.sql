-- 수업 상태 변경 + 횟수 자동 차감 (SQL Editor 에 붙여 넣고 Run, 한 번만)

-- ───────────────────────────────────────────────
-- 1) 설정 표: 규칙 값을 한곳에 (6단계의 Zoom 링크도 여기에 저장)
-- ───────────────────────────────────────────────
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "직원은 설정 조회 가능" on public.app_settings
  for select to authenticated using ((select public.is_staff()));

insert into public.app_settings (key, value) values
  ('free_cancel_hours_before', '1'),            -- 수업 몇 시간 전까지 취소하면 무료인지
  ('free_cancels_per_month', '1'),              -- 한 달에 무료 취소 가능한 횟수 (모든 취소를 셈)
  ('business_time_zone', '"Asia/Seoul"');       -- "그 달"을 나누는 기준 시간대

-- 설정 값을 글자로 꺼내는 도우미
create or replace function public.setting_text(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select value #>> '{}' from public.app_settings where key = p_key;
$$;

-- ───────────────────────────────────────────────
-- 2) 표 보강
-- ───────────────────────────────────────────────
-- 취소 시각: 있으면 "취소"(무료 또는 차감), 없으면 결석(노쇼)
alter table public.lessons add column cancelled_at timestamptz;

-- 기록 종류에 "되돌림" 추가, 규칙 사유를 남기는 칸 추가
alter table public.credit_entries drop constraint credit_entries_kind_check;
alter table public.credit_entries add constraint credit_entries_kind_check
  check (kind in ('plan', 'lesson_completed', 'absent', 'late_cancel', 'free_cancel', 'adjust', 'revert'));
alter table public.credit_entries add column detail text;
  -- 취소: 'early_first'(시간 내 + 그 달 첫 취소) / 'within_hour'(시간 지남) / 'monthly_limit'(그 달 이미 취소함)
  -- 되돌림: 되돌리기 전 상태 ('completed' / 'absent' / 'free_cancel')

-- ───────────────────────────────────────────────
-- 3) 취소 미리보기: 지금(또는 지정 시각) 취소하면 무료인지, 차감인지
--    실제 처리(4번)도 이 함수로 판단하므로 미리보기와 결과가 항상 같음
-- ───────────────────────────────────────────────
create or replace function public.preview_cancel(
  p_lesson_id uuid,
  p_cancelled_at timestamptz default now()
)
returns table (free boolean, reason text, cancels_this_month integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lesson public.lessons;
  v_hours numeric := public.setting_text('free_cancel_hours_before')::numeric;
  v_limit integer := public.setting_text('free_cancels_per_month')::integer;
  v_tz text := public.setting_text('business_time_zone');
  v_in_time boolean;
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'lesson_not_found';
  end if;

  -- 같은 학생, 같은 달(기준 시간대)의 다른 취소 수 (무료·차감 모두)
  select count(*) into cancels_this_month
  from public.lessons o
  where o.student_id = v_lesson.student_id
    and o.id <> v_lesson.id
    and o.cancelled_at is not null
    and date_trunc('month', o.starts_at at time zone v_tz)
      = date_trunc('month', v_lesson.starts_at at time zone v_tz);

  v_in_time := p_cancelled_at <= v_lesson.starts_at - make_interval(secs => v_hours * 3600);
  free := v_in_time and cancels_this_month < v_limit;
  reason := case
    when not v_in_time then 'within_hour'
    when cancels_this_month >= v_limit then 'monthly_limit'
    else 'early_first'
  end;
  return next;
end;
$$;

-- ───────────────────────────────────────────────
-- 4) 수업 상태 변경: 상태 변경 + 횟수 기록을 한 번에 (둘 중 하나만 되는 일 없음)
--    p_action: 'complete' 완료 / 'absent' 결석 / 'cancel' 취소 / 'revert' 되돌리기
-- ───────────────────────────────────────────────
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
  v_net integer;
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

  if p_action = 'complete' then
    update public.lessons set status = 'completed' where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, created_by)
    values (v_lesson.student_id, -1, 'lesson_completed', v_lesson.id, v_me);
    return 'completed';

  elsif p_action = 'absent' then
    update public.lessons set status = 'absent', cancelled_at = null where id = v_lesson.id;
    insert into public.credit_entries (student_id, delta, kind, lesson_id, created_by)
    values (v_lesson.student_id, -1, 'absent', v_lesson.id, v_me);
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
      values (v_lesson.student_id, -1, 'late_cancel', v_lesson.id, v_reason, v_me);
      return 'absent';
    end if;

  elsif p_action = 'revert' then
    if v_lesson.status = 'scheduled' then
      raise exception 'not_processed';
    end if;
    -- 이 수업 때문에 늘거나 준 횟수를 모두 되돌림 (예: 완료 −1 → 되돌림 +1)
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

-- 로그인한 사용자만 호출 가능 (로그인 안 한 접속은 차단)
revoke execute on function public.setting_text(text) from public, anon;
revoke execute on function public.preview_cancel(uuid, timestamptz) from public, anon;
revoke execute on function public.set_lesson_status(uuid, text, timestamptz) from public, anon;
grant execute on function public.setting_text(text) to authenticated;
grant execute on function public.preview_cancel(uuid, timestamptz) to authenticated;
grant execute on function public.set_lesson_status(uuid, text, timestamptz) to authenticated;
