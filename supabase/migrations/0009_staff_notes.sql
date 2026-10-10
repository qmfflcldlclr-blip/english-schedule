-- 홈 화면 메모 (매니저·선생님 각자 1칸) — SQL Editor 에 붙여 넣고 Run, 한 번만

create table public.staff_notes (
  owner_id uuid primary key references public.profiles (id) on delete cascade, -- 메모 주인 (1명당 1칸)
  content text not null default '' check (length(content) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.staff_notes enable row level security;

-- 매니저·선생님은 서로의 메모를 볼 수 있음
create policy "직원은 메모 조회 가능"
  on public.staff_notes for select to authenticated
  using ((select public.is_staff()));

-- 자기 메모 칸만 만들고 고칠 수 있음 (상대방 메모는 읽기만)
create policy "본인 메모만 추가 가능"
  on public.staff_notes for insert to authenticated
  with check ((select public.is_staff()) and owner_id = (select auth.uid()));

create policy "본인 메모만 수정 가능"
  on public.staff_notes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 삭제 없음, 고칠 수 있는 칸은 내용뿐 (수정 시각은 아래 트리거가 자동 기록)
revoke insert, update, delete on public.staff_notes from authenticated, anon;
grant insert (owner_id, content) on public.staff_notes to authenticated;
grant update (content) on public.staff_notes to authenticated;

create or replace function public.touch_staff_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger staff_notes_touch
  before update on public.staff_notes
  for each row execute function public.touch_staff_note();

-- 지금 있는 매니저·선생님의 빈 메모 칸 미리 만들기
insert into public.staff_notes (owner_id)
select id from public.profiles where role in ('manager', 'teacher')
on conflict do nothing;

-- 확인: 메모 칸 2개 (이름과 함께)
select p.display_name, p.role, n.updated_at
from public.staff_notes n join public.profiles p on p.id = n.owner_id;
