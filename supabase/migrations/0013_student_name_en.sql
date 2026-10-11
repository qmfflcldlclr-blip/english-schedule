-- 학생 영어 이름 칸 — SQL Editor 에 붙여 넣고 Run, 한 번만 (0012 다음에 실행)
-- 비워 두면 영어 화면에서 한글 이름을 자동으로 로마자로 바꿔 보여 줌 (예: 나상현 → Na Sanghyeon)
-- 직접 입력하면 그 이름을 씀 (예: 앤디 → Andy)

alter table public.students add column if not exists name_en text
  check (name_en is null or length(trim(name_en)) > 0);

-- 화면에서 영어 이름도 고칠 수 있게
grant update (name_en) on public.students to authenticated;

-- 확인: name_en 이 보이면 성공
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'students' and column_name = 'name_en';
