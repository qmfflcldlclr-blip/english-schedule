// 데이터베이스 오류 구분 도우미
// 표가 아직 없음 = 해당 SQL 파일(supabase/migrations)을 아직 실행하지 않음
export function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}
