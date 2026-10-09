-- 횟수 기록 보호 강화 (SQL Editor 에 붙여 넣고 Run, 한 번만)
-- 화면에서 직접 추가할 수 있는 기록은 "수동 조정"뿐.
-- 플랜 등록(+N)은 플랜 표의 자동 기록으로만, 수업 차감은 5단계의 규칙 함수로만 생기게 함.

drop policy "직원은 횟수 기록 추가 가능" on public.credit_entries;
create policy "직원은 수동 조정만 직접 추가 가능" on public.credit_entries
  for insert to authenticated
  with check (
    (select public.is_staff())
    and created_by = (select auth.uid())
    and kind = 'adjust'
    and plan_id is null
    and lesson_id is null
  );

-- 플랜 자동 기록은 위 규칙을 거치지 않도록 "함수 소유자 권한"으로 실행
-- (플랜 표의 보안 규칙을 통과한 등록에만 실행되므로 안전)
create or replace function public.record_plan_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.credit_entries (student_id, delta, kind, plan_id, created_by)
  values (new.student_id, new.credits, 'plan', new.id, new.created_by);
  return new;
end;
$$;

-- 이 함수를 화면(API)에서 직접 부를 수 없게 막음 (트리거로만 실행)
revoke execute on function public.record_plan_credits() from public, anon, authenticated;
