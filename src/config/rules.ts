// 수업·횟수 관련 규칙 값은 모두 이 파일에 모아 둠 (바꿀 땐 여기만 수정)
// 데이터베이스(supabase/migrations)에도 같은 범위 검사가 있으니 범위를 바꾸면 함께 수정

// 수업 길이(분): 고를 수 있는 길이와 새 학생 기본값 (30분 = 1회, 60분 = 2회, 90분 = 3회)
export const LESSON_LENGTHS = [30, 60, 90];
export const DEFAULT_LESSON_MINUTES = 30;
export const LESSON_MINUTES_MAX = 90; // 겹침 확인 등에서 "가장 긴 수업" 기준
export const isLessonLength = (n: number) => LESSON_LENGTHS.includes(n);

// 플랜 종류 (4주 기준): 주 N회 → 횟수. perWeek 0 = 1회짜리 테스트 플랜
export const PLAN_OPTIONS = [
  { perWeek: 1, credits: 4 },
  { perWeek: 2, credits: 8 },
  { perWeek: 3, credits: 12 },
  { perWeek: 4, credits: 16 },
  { perWeek: 5, credits: 20 },
  { perWeek: 0, credits: 1 },
];
export const isPlanCredits = (n: number) => PLAN_OPTIONS.some((o) => o.credits === n);

// 수동 조정 1번에 바꿀 수 있는 최대 횟수 (입력 실수 방지용)
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

// 횟수 차감 기준: 이 길이(분) 수업 = 1회. 60분 = 2회, 90분 = 3회 (데이터베이스 0018 설정과 같은 값)
export const CREDIT_BASE_MINUTES = 30;

// 수업 1개가 몇 회인지 (정수로 반올림, 최소 1회) — 데이터베이스 함수 lesson_credit_units(0019) 와 같은 계산
export function creditUnits(minutes: number) {
  return Math.max(1, Math.round(minutes / CREDIT_BASE_MINUTES));
}
