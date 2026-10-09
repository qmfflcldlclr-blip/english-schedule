-- 취소·차감 규칙 테스트 (0007 실행 후, SQL Editor 에 붙여 넣고 Run)
-- 매니저(lee)로 로그인한 것처럼 테스트 학생·수업을 만들어 규칙을 확인합니다.
-- 끝나면 일부러 오류를 내서 모든 테스트 데이터를 자동으로 되돌립니다(아무것도 남지 않음).
--   성공: "TEST OK ..." 메시지가 오류처럼 빨갛게 표시됨  ← 정상
--   실패: "TEST FAIL ..." 메시지에 어떤 시나리오가 틀렸는지 표시

do $$
declare
  v_lee uuid := (select id from public.profiles where username = 'lee');
  v_student uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; l6 uuid; l7 uuid;
  v_status text;
  v_balance integer;
  v_detail text;
  v_free boolean;
begin
  -- lee 로 로그인한 상태 흉내
  perform set_config('request.jwt.claims', json_build_object('sub', v_lee, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.students (name) values ('TEST 학생') returning id into v_student;
  insert into public.plans (student_id, credits, paid_on, starts_on) values (v_student, 10, current_date, current_date);

  -- 테스트용 수업 (2030년: 충분히 미래라 "지금" 취소하면 1시간 전 조건을 만족)
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-10 07:00Z', 30) returning id into l1;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-20 07:00Z', 30) returning id into l2;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-02-05 07:00Z', 30) returning id into l3;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, now() + interval '30 minutes', 30) returning id into l4;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-03-01 07:00Z', 30) returning id into l5;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-03-02 07:00Z', 30) returning id into l6;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-03-03 07:00Z', 30) returning id into l7;

  -- ① 충분히 전에, 그 달 첫 취소 → 무료
  v_status := public.set_lesson_status(l1, 'cancel');
  if v_status <> 'free_cancel' then raise exception 'TEST FAIL ①: 첫 취소가 무료가 아님 (%)', v_status; end if;

  -- ② 같은 달 두 번째 취소 → 차감
  select free, reason into v_free, v_detail from public.preview_cancel(l2);
  if v_free or v_detail <> 'monthly_limit' then raise exception 'TEST FAIL ②: 미리보기가 차감(monthly_limit)이 아님'; end if;
  v_status := public.set_lesson_status(l2, 'cancel');
  if v_status <> 'absent' then raise exception 'TEST FAIL ②: 두 번째 취소가 차감되지 않음 (%)', v_status; end if;

  -- ③ 다음 달 첫 취소 → 다시 무료
  v_status := public.set_lesson_status(l3, 'cancel');
  if v_status <> 'free_cancel' then raise exception 'TEST FAIL ③: 새 달 첫 취소가 무료가 아님 (%)', v_status; end if;

  -- ④ 30분 전 취소 → 차감 (사유: within_hour)
  v_status := public.set_lesson_status(l4, 'cancel');
  select detail into v_detail from public.credit_entries where lesson_id = l4;
  if v_status <> 'absent' or v_detail <> 'within_hour' then raise exception 'TEST FAIL ④: 1시간 이내 취소 처리 오류 (%, %)', v_status, v_detail; end if;

  -- ⑤ 완료 → 되돌리기 → 횟수 복구
  perform public.set_lesson_status(l5, 'complete');
  v_status := public.set_lesson_status(l5, 'revert');
  if v_status <> 'scheduled' then raise exception 'TEST FAIL ⑤: 되돌리기 후 예정이 아님'; end if;
  if (select coalesce(sum(delta), 0) from public.credit_entries where lesson_id = l5) <> 0 then
    raise exception 'TEST FAIL ⑤: 되돌리기 후 횟수가 복구되지 않음';
  end if;

  -- ⑥ 결석(노쇼)은 "취소"로 세지 않음 → 같은 달 취소가 무료
  perform public.set_lesson_status(l6, 'absent');
  v_status := public.set_lesson_status(l7, 'cancel');
  if v_status <> 'free_cancel' then raise exception 'TEST FAIL ⑥: 결석이 취소 횟수로 세어짐 (%)', v_status; end if;

  -- ⑦ 이미 처리된 수업은 다시 처리 불가
  begin
    perform public.set_lesson_status(l1, 'complete');
    raise exception 'TEST FAIL ⑦: 처리된 수업이 다시 처리됨';
  exception when others then
    if sqlerrm like 'TEST FAIL%' then raise; end if;
  end;

  -- ⑧ 화면(API)에서 상태를 직접 바꾸는 것은 막혀 있음
  begin
    update public.lessons set status = 'completed' where id = l5;
    raise exception 'TEST FAIL ⑧: 상태를 직접 바꿀 수 있음';
  exception when insufficient_privilege then null;
  end;

  -- ⑨ 남은 횟수: 10 − 1(②) − 1(④) − 1(⑥ 결석) = 7
  select remaining into v_balance from public.student_balances where student_id = v_student;
  if v_balance <> 7 then raise exception 'TEST FAIL ⑨: 남은 횟수 % (기대값 7)', v_balance; end if;

  raise exception 'TEST OK: 9개 시나리오 모두 통과 (테스트 데이터는 자동으로 삭제됨)';
end;
$$;
