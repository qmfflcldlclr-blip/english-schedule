// 수업·횟수 관련 규칙 값은 모두 이 파일에 모아 둠 (바꿀 땐 여기만 수정)
// 데이터베이스(supabase/migrations)에도 같은 범위 검사가 있으니 범위를 바꾸면 함께 수정

// 수업 길이(분): 새 학생 기본값과 입력 가능 범위
export const DEFAULT_LESSON_MINUTES = 30;
export const LESSON_MINUTES_MIN = 10;
export const LESSON_MINUTES_MAX = 180;
