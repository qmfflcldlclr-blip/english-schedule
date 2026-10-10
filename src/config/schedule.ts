// 달력 화면 설정 (바꿀 땐 여기만 수정)

// PC 주간 시간표의 기본 시간 범위. 24 이상은 다음 날 새벽 (25 = 다음 날 01:00)
// 범위 밖에 수업이 있으면 자동으로 넓어짐
export const CALENDAR_START_HOUR = 15;
export const CALENDAR_END_HOUR = 25;

// 이 시각 전에 시작하는 새벽 수업은 화면에서 "전날" 칸에 이어서 보여 줌 (횟수·취소 규칙과는 무관)
export const DAY_CUTOFF_HOUR = 5;

// 시간표에서 더블클릭·드래그로 고르는 최소 단위(분)
export const SLOT_MINUTES = 15;

// PC 시간표 1시간 높이(px). 15분 수업도 한 줄이 보이도록 넉넉하게
export const HOUR_PX = 112;
