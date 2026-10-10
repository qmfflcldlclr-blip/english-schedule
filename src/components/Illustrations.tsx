// Andy English 그림 모음 (모두 코드로 그린 SVG — 가볍고 확대해도 깨지지 않음)
// 색은 globals.css 의 brand(파랑)·sunny(노랑)와 같은 값을 사용
// 장식용 그림이라 화면 읽기 프로그램은 건너뛰게 aria-hidden 처리

const C = {
  brand100: "#d9ebff",
  brand200: "#b8dbff",
  brand300: "#86c2ff",
  brand400: "#4ea2f7",
  brand500: "#2a84ea",
  brand700: "#1a59a8",
  brand900: "#1b3f6e",
  sunny100: "#fff4cc",
  sunny300: "#ffd95c",
  sunny400: "#ffc933",
  coral: "#ff8a7a",
  mint: "#5fd3b0",
  skin: "#ffd9bd",
  hair: "#5b3a29",
};

type Props = { className?: string };

// 반짝이 별 (4갈래)
function Sparkle({ x, y, r, fill = C.sunny400 }: { x: number; y: number; r: number; fill?: string }) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={fill}
    />
  );
}

// 알파벳 블록
function Block({ x, y, s, fill, letter }: { x: number; y: number; s: number; fill: string; letter: string }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={s * 0.18} fill={fill} />
      <rect x={x + s * 0.12} y={y + s * 0.12} width={s * 0.76} height={s * 0.76} rx={s * 0.12} fill="white" opacity={0.25} />
      <text
        x={x + s / 2}
        y={y + s * 0.7}
        textAnchor="middle"
        fontSize={s * 0.56}
        fontWeight={800}
        fill="white"
      >
        {letter}
      </text>
    </g>
  );
}

// 로고 마크: 파란 말풍선 + 흰 글자 A + 노란 점
export function LogoMark({ className = "size-8" }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M14 4h20a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H22l-9 8v-8.3A10 10 0 0 1 4 26V14A10 10 0 0 1 14 4Z" fill={C.brand500} />
      <path d="M17 29 24 12l7 17M19.8 23h8.4" fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={41} cy={7} r={5} fill={C.sunny400} stroke="white" strokeWidth={2} />
    </svg>
  );
}

// 상단 로고: 마크 + 이름
export function Logo({ className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-8 shrink-0" />
      <span className="text-lg font-extrabold tracking-tight text-brand-900">
        Andy <span className="text-brand-500">English</span>
      </span>
    </span>
  );
}

// 로그인 화면 큰 그림: 노트북 속 선생님 + 인사 말풍선 + ABC 블록 + 책
export function LoginHero({ className = "w-full" }: Props) {
  return (
    <svg viewBox="0 0 320 210" className={className} aria-hidden>
      {/* 배경 */}
      <ellipse cx={160} cy={120} rx={150} ry={84} fill={C.brand100} />
      <circle cx={52} cy={70} r={18} fill={C.sunny100} />
      <Sparkle x={292} y={86} r={8} />
      <Sparkle x={30} y={124} r={6} fill={C.brand300} />
      <Sparkle x={250} y={14} r={5} fill={C.brand300} />

      {/* 노트북 */}
      <rect x={96} y={62} width={128} height={88} rx={9} fill={C.brand900} />
      <rect x={103} y={69} width={114} height={72} rx={5} fill="#f2f8ff" />
      <svg x={103} y={69} width={114} height={72} viewBox="0 0 114 72">
        {/* 선생님: 몸 · 얼굴 · 머리 */}
        <path d="M27 72c2-16 15-24 30-24s28 8 30 24Z" fill={C.brand400} />
        <path d="M49 47h16v6a8 8 0 0 1-16 0Z" fill={C.skin} />
        <path d="M37 30c0-14 9-22 20-22s20 8 20 22c0 6-1 12-3 15H40c-2-3-3-9-3-15Z" fill={C.hair} />
        <circle cx={57} cy={31} r={14} fill={C.skin} />
        <path d="M43 27c3-9 10-12 15-12 6 0 11 3 13 10-7 1-14-1-19-5-2 3-5 6-9 7Z" fill={C.hair} />
        <circle cx={51.5} cy={31} r={1.7} fill={C.brand900} />
        <circle cx={62.5} cy={31} r={1.7} fill={C.brand900} />
        <path d="M52 37q5 4 10 0" fill="none" stroke={C.brand900} strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={47.5} cy={35.5} r={2.2} fill={C.coral} opacity={0.45} />
        <circle cx={66.5} cy={35.5} r={2.2} fill={C.coral} opacity={0.45} />
        {/* 손 흔들기 */}
        <path d="M92 40c-3-6-1-12 3-12s5 5 4 9" fill={C.skin} />
        <path d="M86 72c0-12 3-22 8-32" fill="none" stroke={C.brand400} strokeWidth={8} strokeLinecap="round" />
      </svg>
      <circle cx={160} cy={65.5} r={1.4} fill={C.brand300} />
      <path d="M78 150h164l-10 12H88Z" fill={C.brand300} />
      <rect x={144} y={150} width={32} height={4} rx={2} fill={C.brand400} />

      {/* 말풍선 */}
      <g>
        <rect x={14} y={20} width={84} height={34} rx={17} fill="white" stroke={C.brand200} strokeWidth={2} />
        <path d="M78 52l14 12-2-14Z" fill="white" stroke={C.brand200} strokeWidth={2} strokeLinejoin="round" />
        <rect x={76} y={46} width={14} height={7} fill="white" />
        <text x={56} y={43} textAnchor="middle" fontSize={17} fontWeight={800} fill={C.brand700}>Hello!</text>
      </g>
      <g>
        <rect x={208} y={26} width={104} height={34} rx={17} fill={C.sunny300} />
        <path d="M222 56l-8 12 18-10Z" fill={C.sunny300} />
        <text x={260} y={48} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.brand900}>How are you?</text>
      </g>

      {/* ABC 블록 */}
      <Block x={22} y={158} s={30} fill={C.sunny400} letter="A" />
      <Block x={55} y={158} s={30} fill={C.brand400} letter="B" />
      <Block x={38} y={126} s={30} fill={C.coral} letter="C" />

      {/* 책 더미 */}
      <rect x={244} y={176} width={64} height={12} rx={3} fill={C.mint} />
      <rect x={250} y={164} width={56} height={12} rx={3} fill={C.coral} />
      <rect x={240} y={152} width={60} height={12} rx={3} fill={C.brand500} />
      <path d="M248 158h36M256 170h30M252 182h40" stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <path d="M286 140l10 12h-20Z" fill={C.sunny400} />
      <circle cx={286} cy={136} r={4} fill={C.sunny400} />
    </svg>
  );
}

export type DayPart = "morning" | "afternoon" | "evening";

// 홈 인사 카드 그림: 아침(떠오르는 해) · 오후(해와 구름) · 저녁(달과 별)
export function GreetingArt({ part, className = "size-20" }: Props & { part: DayPart }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      {part === "evening" ? (
        <>
          <circle cx={40} cy={40} r={34} fill={C.brand900} />
          <path d="M48 20a20 20 0 1 0 12 32A16 16 0 1 1 48 20Z" fill={C.sunny300} />
          <Sparkle x={24} y={26} r={5} fill="white" />
          <Sparkle x={58} y={58} r={3.5} fill="white" />
          <circle cx={22} cy={52} r={1.6} fill="white" />
        </>
      ) : (
        <>
          <circle cx={40} cy={40} r={34} fill={part === "morning" ? C.sunny100 : C.brand100} />
          <g stroke={C.sunny400} strokeWidth={4} strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1={40} y1={14} x2={40} y2={19} transform={`rotate(${a} 40 ${part === "morning" ? 44 : 38})`} />
            ))}
          </g>
          <circle cx={40} cy={part === "morning" ? 44 : 38} r={14} fill={C.sunny400} />
          {part === "morning" ? (
            <rect x={10} y={52} width={60} height={20} fill={C.sunny100} />
          ) : (
            <path d="M30 62h28a9 9 0 0 0 0-18 12 12 0 0 0-23 2 8 8 0 0 0-5 16Z" fill="white" />
          )}
          {part === "morning" && <path d="M12 52h56" stroke={C.brand300} strokeWidth={3} strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

// 빈 화면: 수업 없음 (펼친 책 + 따뜻한 차)
export function EmptyLessonsArt({ className = "h-28" }: Props) {
  return (
    <svg viewBox="0 0 180 110" className={className} aria-hidden>
      <ellipse cx={90} cy={98} rx={78} ry={8} fill={C.brand100} />
      <path d="M22 40c16-6 34-6 48 2v52c-14-8-32-8-48-2Z" fill="white" stroke={C.brand300} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M118 40c-16-6-34-6-48 2v52c14-8 32-8 48-2Z" fill="white" stroke={C.brand300} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M32 54c10-3 20-3 28 1M32 66c10-3 20-3 28 1M80 55c8-4 18-4 28-1M80 67c8-4 18-4 28-1" stroke={C.brand200} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={130} y={58} width={30} height={34} rx={7} fill={C.sunny400} />
      <path d="M160 66h4a7 7 0 0 1 0 14h-4" fill="none" stroke={C.sunny400} strokeWidth={5} />
      <path d="M140 50c-3-5 3-7 0-13M150 50c-3-5 3-7 0-13" fill="none" stroke={C.brand300} strokeWidth={2.5} strokeLinecap="round" />
      <Sparkle x={124} y={22} r={6} />
      <Sparkle x={20} y={20} r={4} fill={C.brand300} />
    </svg>
  );
}

// 빈 화면: 학생 없음 (ABC 블록 + 연필)
export function EmptyStudentsArt({ className = "h-28" }: Props) {
  return (
    <svg viewBox="0 0 180 110" className={className} aria-hidden>
      <ellipse cx={90} cy={98} rx={78} ry={8} fill={C.brand100} />
      <Block x={40} y={60} s={34} fill={C.sunny400} letter="A" />
      <Block x={77} y={60} s={34} fill={C.brand400} letter="B" />
      <Block x={58} y={24} s={34} fill={C.coral} letter="C" />
      <g transform="rotate(-35 140 70)">
        <rect x={126} y={40} width={14} height={52} rx={2} fill={C.mint} />
        <rect x={126} y={36} width={14} height={8} rx={2} fill={C.coral} />
        <path d="M126 92h14l-7 13Z" fill={C.skin} />
        <path d="M131 101.5h4l-2 3.5Z" fill={C.brand900} />
      </g>
      <Sparkle x={150} y={18} r={6} />
      <Sparkle x={26} y={36} r={4} fill={C.brand300} />
    </svg>
  );
}
