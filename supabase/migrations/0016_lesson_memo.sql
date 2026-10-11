-- 수업 노트: 누가 언제 썼는지 기록 + 완료된 수업에도 노트 쓰기 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0015 다음)

alter table public.lessons add column if not exists memo_updated_at timestamptz;
alter table public.lessons add column if not exists memo_updated_by uuid references public.profiles (id);

-- 노트가 바뀔 때마다 시각·사람 자동 기록 (수업 추가·수정 화면에서 바꿔도 똑같이)
create or replace function public.touch_lesson_memo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.memo is not null)
     or (tg_op = 'UPDATE' and new.memo is distinct from old.memo) then
    new.memo_updated_at := now();
    new.memo_updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_touch_memo on public.lessons;
create trigger lessons_touch_memo
  before insert or update on public.lessons
  for each row execute function public.touch_lesson_memo();

-- 노트만 저장: 완료·결석·취소된 수업에도 쓸 수 있음 (다른 칸은 그대로 보호)
create or replace function public.set_lesson_memo(p_lesson_id uuid, p_memo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;
  if length(coalesce(p_memo, '')) > 2000 then
    raise exception 'too_long';
  end if;
  update public.lessons
  set memo = nullif(trim(coalesce(p_memo, '')), '')
  where id = p_lesson_id;
  if not found then
    raise exception 'lesson_not_found';
  end if;
end;
$$;

revoke execute on function public.set_lesson_memo(uuid, text) from public, anon;
grant execute on function public.set_lesson_memo(uuid, text) to authenticated;

-- 확인: 함수가 보이면 성공
select proname from pg_proc where proname = 'set_lesson_memo';
