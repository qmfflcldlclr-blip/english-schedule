-- Zoom 링크 설정 (SQL Editor 에 붙여 넣고 Run, 한 번만)

-- 고정 Zoom 링크 1개 (처음엔 비어 있음 → 설정 화면에서 입력)
insert into public.app_settings (key, value) values ('zoom_url', 'null');

-- 설정 중 Zoom 링크만 화면에서 수정 가능 (취소 규칙 값은 SQL 로만 변경)
create policy "직원은 Zoom 링크 수정 가능" on public.app_settings
  for update to authenticated
  using ((select public.is_staff()) and key = 'zoom_url')
  with check ((select public.is_staff()) and key = 'zoom_url');

revoke insert, update, delete on public.app_settings from authenticated, anon;
grant update (value, updated_at) on public.app_settings to authenticated;

-- 보안 보강: 설정 값 도우미(setting_text)는 규칙 함수 안에서만 쓰므로 화면(API)에서 직접 호출 금지
-- (나중에 학생 로그인이 생겨도 설정 값을 보안 규칙을 우회해 읽을 수 없게)
revoke execute on function public.setting_text(text) from authenticated;
