// 시간대 이름을 화면에 보여줄 때 쓰는 이름 (상대방 시간 "필리핀 15:00" 표시용)
// 새 시간대의 사용자가 생기면 여기에 추가 (없으면 도시 이름으로 표시)
const zoneNames: Record<string, { ko: string; en: string }> = {
  "Asia/Seoul": { ko: "한국", en: "Korea" },
  "Asia/Manila": { ko: "필리핀", en: "Philippines" },
};

export function zoneName(timeZone: string, locale: string) {
  const names = zoneNames[timeZone];
  if (names) return locale === "ko" ? names.ko : names.en;
  return timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
}
