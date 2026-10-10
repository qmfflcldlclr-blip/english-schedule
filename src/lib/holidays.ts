import "server-only";
import { cacheLife } from "next/cache";

// 한국·필리핀 공휴일 (무료 공휴일 서비스 Nager.Date, 키 필요 없음)
// 하루 동안 저장해 두고 씀. 받아 오지 못하면 공휴일 표시만 빠지고 화면은 정상

export type Holiday = { country: "KR" | "PH"; name: string };
const COUNTRIES = ["KR", "PH"] as const;

async function fetchYear(year: number, country: (typeof COUNTRIES)[number]) {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
  if (!res.ok) throw new Error(`holidays ${country} ${year}: ${res.status}`); // 실패는 저장하지 않음
  const rows = (await res.json()) as { date: string; localName: string; name: string }[];
  // 한국은 한국어 이름, 필리핀은 영어 이름
  return rows.map((r) => ({ date: r.date, name: country === "KR" ? r.localName : r.name }));
}

// from~to(포함) 날짜의 공휴일. 같은 날 두 나라 공휴일이면 둘 다
export async function getHolidays(from: string, to: string): Promise<Record<string, Holiday[]>> {
  const years = [...new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))])];
  const result: Record<string, Holiday[]> = {};
  await Promise.all(
    years.flatMap((y) =>
      COUNTRIES.map(async (country) => {
        try {
          for (const h of await fetchYear(y, country)) {
            if (h.date < from || h.date > to) continue;
            const list = (result[h.date] ??= []);
            // 같은 날 같은 나라 공휴일이 겹치면 한 번만 (예: 설날 연휴)
            if (!list.some((x) => x.country === country && x.name === h.name)) list.push({ country, name: h.name });
          }
        } catch {
          // 공휴일 서비스 문제 → 표시 없이 넘어감
        }
      }),
    ),
  );
  return result;
}

export const flag = { KR: "🇰🇷", PH: "🇵🇭" } as const;
