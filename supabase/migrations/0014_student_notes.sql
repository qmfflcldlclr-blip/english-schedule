-- 학생별 노트: 개별용(쓴 사람만 봄) + 공유용(매니저·선생님 함께) — SQL Editor 에 붙여 넣고 Run, 한 번만 (0013 다음)

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade, -- 학생 완전 삭제 시 함께 삭제
  visibility text not null check (visibility in ('private', 'shared')),
  owner_id uuid references public.profiles (id) on delete cascade, -- 개별용: 쓴 사람 / 공유용: 비움
  content text not null default '' check (length(content) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  check ((visibility = 'private') = (owner_id is not null))
);

-- 학생 1명당: 공유용 1칸, 사람마다 개별용 1칸
create unique index student_notes_one_each on public.student_notes
  (student_id, visibility, coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.student_notes enable row level security;

-- 공유용은 직원 모두, 개별용은 쓴 사람만 볼 수 있음
create policy "공유 노트와 내 개별 노트만 조회"
  on public.student_notes for select to authenticated
  using ((select public.is_staff()) and (visibility = 'shared' or owner_id = (select auth.uid())));

-- 화면에서 직접 쓰기·지우기는 막고, 아래 함수로만 저장
revoke insert, update, delete on public.student_notes from authenticated, anon;

-- 저장: 개별용은 내 칸, 공유용은 학생 공용 칸. 처음이면 새로 만들고, 있으면 내용 바꿈
create or replace function public.save_student_note(p_student_id uuid, p_visibility text, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
begin
  if not public.is_staff() then
    raise exception 'not_allowed';
  end if;
  if p_visibility not in ('private', 'shared') then
    raise exception 'bad_visibility';
  end if;
  v_owner := case when p_visibility = 'private' then v_me end;

  update public.student_notes
  set content = coalesce(p_content, ''), updated_at = now(), updated_by = v_me
  where student_id = p_student_id and visibility = p_visibility and owner_id is not distinct from v_owner;
  if not found then
    insert into public.student_notes (student_id, visibility, owner_id, content, updated_by)
    values (p_student_id, p_visibility, v_owner, coalesce(p_content, ''), v_me);
  end if;
end;
$$;

revoke execute on function public.save_student_note(uuid, text, text) from public, anon;
grant execute on function public.save_student_note(uuid, text, text) to authenticated;

-- 확인: 함수가 보이면 성공
select proname from pg_proc where proname = 'save_student_note';
