-- 수업 처리·연기·플랜 횟수 바꾸기 테스트 (0019 실행 후, SQL Editor 에 붙여 넣고 Run)
-- 매니저(lee)로 로그인한 것처럼 테스트 학생·수업을 만들어 규칙을 확인합니다.
-- 끝나면 일부러 오류를 내서 모든 테스트 데이터를 자동으로 되돌립니다(아무것도 남지 않음).
--   성공: "TEST OK ..." 메시지가 오류처럼 빨갛게 표시됨  ← 정상
--   실패: "TEST FAIL ..." 메시지에 어떤 시나리오가 틀렸는지 표시

do $$
declare
  v_lee uuid := (select id from public.profiles where username = 'lee');
  v_student uuid;
  v_plan uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  v_status text;
  v_balance numeric;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_lee, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.students (name) values ('TEST 학생') returning id into v_student;
  insert into public.plans (student_id, credits, paid_on, starts_on) values (v_student, 4, current_date, current_date) returning id into v_plan;

  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-10 07:00Z', 30) returning id into l1;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-11 07:00Z', 60) returning id into l2;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-12 07:00Z', 30) returning id into l3;
  insert into public.lessons (student_id, starts_at, duration_minutes) values (v_student, '2030-01-13 07:00Z', 30) returning id into l4;

  -- ① 연기는 몇 번이든 차감 없음
  perform public.set_lesson_status(l1, 'cancel');
  v_status := public.set_lesson_status(l3, 'cancel');
  select remaining into v_balance from public.student_balances where student_id = v_student;
  if v_status <> 'free_cancel' or v_balance <> 4 then raise exception 'TEST FAIL ①: 연기가 차감됨 (%, %)', v_status, v_balance; end if;

  -- ② 60분 완료 = 2회, 결석 = 1회
  perform public.set_lesson_status(l2, 'complete');
  perform public.set_lesson_status(l4, 'absent');
  select remaining into v_balance from public.student_balances where student_id = v_student;
  if v_balance <> 1 then raise exception 'TEST FAIL ②: 남은 횟수 1 이 아님 (%)', v_balance; end if;

  -- ③ 되돌리기 → 결석 1회 복구
  perform public.set_lesson_status(l4, 'revert');
  select remaining into v_balance from public.student_balances where student_id = v_student;
  if v_balance <> 2 then raise exception 'TEST FAIL ③: 되돌리기 후 2 가 아님 (%)', v_balance; end if;

  -- ④ 플랜 4회 → 12회: 남은 횟수 +8
  perform public.change_plan_credits(v_plan, 12);
  select remaining into v_balance from public.student_balances where student_id = v_student;
  if v_balance <> 10 or (select credits from public.plans where id = v_plan) <> 12 then
    raise exception 'TEST FAIL ④: 플랜 변경 후 10 이 아님 (%)', v_balance;
  end if;

  raise exception 'TEST OK — 모든 시나리오 통과 (테스트 데이터는 자동으로 지워짐)';
end;
$$;
