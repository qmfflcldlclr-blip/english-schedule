// 수업·횟수 관련 규칙 값은 모두 이 파일에 모아 둠 (바꿀 땐 여기만 수정)
// 데이터베이스(supabase/migrations)에도 같은 범위 검사가 있으니 범위를 바꾸면 함께 수정

// 수업 길이(분): 새 학생 기본값과 입력 가능 범위
export const DEFAULT_LESSON_MINUTES = 15;
export const LESSON_MINUTES_MIN = 10;
export const LESSON_MINUTES_MAX = 180;

// 플랜 1개에 등록할 수 있는 최대 횟수, 수동 조정 1번에 바꿀 수 있는 최대 횟수 (입력 실수 방지용)
export const PLAN_CREDITS_MAX = 200;
export const ADJUST_MAX = 50;

// 반복 일정을 한 번에 만들 수 있는 최대 기간(주)
export const REPEAT_MAX_WEEKS = 26;

// 홈 메모 최대 글자 수 (데이터베이스 0009 의 검사와 같은 값)
export const NOTE_MAX = 2000;

// 피드백 1건 최대 글자 수 (데이터베이스 0010 의 검사와 같은 값)
export const FEEDBACK_MAX = 2000;

// 남은 횟수 0회인 채로 이 일수가 지나고 예정 수업이 없으면 자동 보관
export const AUTO_ARCHIVE_DAYS = 30;

// 홈 공지: 남은 횟수가 이 값 이하인 학생을 보여 줌 (0회·마이너스 포함)
export const LOW_CREDIT_THRESHOLD = 3;

// 횟수 차감 기준: 이 길이(분) 수업 = 1회. 15분 = 0.5회, 45분 = 1.5회, 60분 = 2회 (데이터베이스 0018 설정과 같은 값)
export const CREDIT_BASE_MINUTES = 30;

// 수업 1개가 몇 회인지 (0.5회 단위 반올림, 최소 0.5회) — 데이터베이스 함수 lesson_credit_units 와 같은 계산
export function creditUnits(minutes: number) {
  return Math.max(0.5, Math.round((minutes * 2) / CREDIT_BASE_MINUTES) / 2);
}

// 0.5회 단위인지 (플랜·조정 입력 검사)
export function isHalfStep(n: number) {
  return Number.isFinite(n) && Math.round(n * 2) === n * 2;
}
