-- 학생 메모 → 학생 노트(개별용)로 옮기기 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0014 다음)
-- 지금까지 학생 정보의 "메모"에 적은 내용을 매니저(lee)의 개별용 노트로 옮기고, 메모 칸은 비움
-- 이미 개별용 노트가 있으면 그 아래에 이어 붙임. 중간에 오류가 나면 아무것도 바뀌지 않음

do $$
declare
  v_lee uuid := (select id from public.profiles where username = 'lee');
  r record;
begin
  if v_lee is null then
    raise exception '매니저 계정(lee)을 찾을 수 없습니다';
  end if;

  for r in select id, trim(memo) as memo from public.students where length(trim(coalesce(memo, ''))) > 0 loop
    update public.student_notes
    set content = left(case when content = '' then r.memo else content || E'\n' || r.memo end, 2000),
        updated_at = now(), updated_by = v_lee
    where student_id = r.id and visibility = 'private' and owner_id = v_lee;
    if not found then
      insert into public.student_notes (student_id, visibility, owner_id, content, updated_by)
      values (r.id, 'private', v_lee, left(r.memo, 2000), v_lee);
    end if;
  end loop;

  update public.students set memo = null where memo is not null;
end;
$$;

-- 확인: 옮겨진 개별용 노트 수, 남은 메모 수(0 이면 성공)
select
  (select count(*) from public.student_notes where visibility = 'private') as 개별용_노트,
  (select count(*) from public.students where memo is not null) as 남은_메모;
