// 사이트 사용 설명서 (홈 → "📖 사용 설명서"). 화면 문구가 바뀌면 여기도 함께 고칠 것
// 글 안의 **굵게** 는 굵은 글씨로 보여 줌

export type GuideSection = {
  id: string; // 목차 이동용
  icon: string;
  title: string;
  intro?: string;
  steps?: string[]; // 번호 순서대로
  bullets?: string[]; // 점 목록
  table?: { head: string[]; rows: string[][] };
  tip?: string; // 노란 상자
};

export type Guide = { title: string; subtitle: string; sections: GuideSection[] };

const ko: Guide = {
  title: "사용 설명서",
  subtitle: "영어 화상수업 일정·횟수 관리 사이트를 쓰는 방법이에요. 궁금한 부분만 골라 읽어도 돼요.",
  sections: [
    {
      id: "start",
      icon: "👋",
      title: "시작하기",
      bullets: [
        "아이디로 로그인해요. **Lee**(매니저, 한국 시간)와 **Michelle**(선생님, 필리핀 시간) 두 계정이 있어요.",
        "메뉴: **홈 · 달력 · 학생 · 피드백 · 설정**. 폰은 화면 아래, PC는 화면 위에 있어요.",
        "오른쪽 위 **한국어 / English** 버튼으로 언어를 바꿔요. 영어 화면에서는 학생 이름이 영어로, 한글 노트·피드백은 영어 번역으로 보여요.",
        "시간은 **각자 시간대로** 크게, 상대방 시간대는 작게 같이 보여요. 예) Lee: 18:00 (필리핀 17:00)",
      ],
      tip: "화면이 예전 모습 그대로라면 **Ctrl + Shift + R**(폰은 새로고침)로 한 번 새로 열어 주세요.",
    },
    {
      id: "home",
      icon: "🏠",
      title: "홈",
      bullets: [
        "**다음 수업**과 **오늘 수업** 목록을 보여 줘요. 수업 노트가 있으면 📝 와 노란 띠로 표시돼요.",
        "**📢 횟수가 얼마 안 남은 학생**: 남은 횟수 3회 이하인 학생이 나와요. 누르면 학생 화면으로 가요.",
        "**메모 2칸**: 매니저 메모 · 선생님 메모. 각자 자기 칸만 쓸 수 있고, 상대 칸은 읽기만 해요. 다른 언어로 쓴 메모는 자동 번역돼요.",
      ],
    },
    {
      id: "calendar",
      icon: "📅",
      title: "달력 — 보기와 수업 추가",
      bullets: [
        "한 주(일~토)를 보여 줘요. 제목 양옆 ◀ ▶ 로 주를 옮기고, 제목을 누르면 날짜를 골라 이동해요.",
        "PC는 시간표(한국 17:00~01:00, 필리핀 16:00~00:00), 폰은 날짜를 누르면 그날 수업 목록이 나와요.",
        "공휴일은 빨간 글씨와 이름으로 보여요 (🇰🇷 한국, 🇵🇭 필리핀).",
        "오른쪽 칸 맨 위 **이번 달 현황**: 수업 수·총 시간·횟수 환산, 길이별 수업 수, 완료·예정·결석·연기. (폰은 \"📊 이번 달 현황\" 버튼)",
      ],
      steps: [
        "**PC**: 빈 시간을 **한 번 클릭** → 오른쪽 칸에 새 수업 폼이 떠요. **드래그**하면 시작 시각과 길이가 함께 정해져요 (30분 단위).",
        "수업 길이는 **30분 · 60분 · 90분** 중에서 골라요. 8:20 처럼 정각·30분이 아닌 시작은 폼의 시작 시간에서 10분 단위로 고쳐요.",
        "학생을 고르면(이름 일부나 초성으로 검색) 그 학생의 기본 수업 길이가 들어가요.",
        "폼이 열린 채로 다른 빈 시간을 누르면 날짜·시각만 바뀌어요.",
        "**저장**을 누르면 달력에 바로 나타나요. 같은 시간에 다른 수업이 있으면 경고가 나와요.",
        "**폰**이나 다른 방법: 위쪽 **+ 수업 추가** 버튼.",
      ],
    },
    {
      id: "lesson",
      icon: "✅",
      title: "달력 — 수업 처리·노트·피드백",
      intro: "수업 칸을 누르면 오른쪽 칸(폰은 아래에서 올라오는 창)에 그 수업이 열려요.",
      bullets: [
        "**✓ 완료 / ✕ 결석 / ⏸ 연기**: 바로 처리돼요. 완료·결석은 수업 길이만큼 차감, **연기는 차감 없음** (선생님·매니저가 허락한 경우에만).",
        "플랜의 **첫 수업**은 초록 테두리 + **시작**, **마지막 회차 수업**은 빨간 테두리 + **종료** 로 표시돼요.",
        "**📝 수업 노트**(노란 상자): Lee·Michelle이 함께 보고 쓰는 메모. 완료된 수업에도 쓸 수 있고, 누가 언제 썼는지 보여요. 노트가 있는 수업 칸에는 노란 띠가 생겨요.",
        "**💬 수업 피드백**: 학부모에게 전할 내용. 종류(👍 잘한 점 / ✏️ 고칠 점 / 📌 메모)를 고르고 써요. 피드백이 있는 수업 칸에는 💬 가 붙어요.",
        "**수업 수정**: 학생·날짜·시각·길이 바꾸기, 삭제 (예정 수업만).",
        "**되돌리기**는 **자세히 ›** 화면에서 해요.",
        "아래에는 그 학생의 **한 달 수업 목록**이 나와요. 누르면 그 수업으로 이동해요.",
      ],
      tip: "PC에서는 예정 수업 칸을 **끌어서** 다른 날·시간으로 옮길 수 있어요 (놓으면 확인 창이 떠요).",
    },
    {
      id: "repeat",
      icon: "🔁",
      title: "달력 — 주 복사 · 반복 생성 · 인쇄",
      bullets: [
        "**주 복사**: 가져올 주를 고르면(최근 6주 목록 또는 날짜) 지금 보는 주에 같은 요일·시간으로 복사해요. 이미 있는 수업과 **한국 공휴일**은 건너뛰어요.",
        "**반복 생성**: 학생·요일·시간·기간을 정해 여러 주 수업을 한 번에 만들어요.",
        "**인쇄**: 한 달 달력(1쪽) + 학생별 횟수 표(2쪽)를 A4 가로로 인쇄해요. 학생 한 명만 골라 인쇄할 수도 있어요.",
      ],
    },
    {
      id: "students",
      icon: "🧑‍🎓",
      title: "학생",
      bullets: [
        "목록에서 남은 횟수는 색으로 보여요: 🟢 넉넉함 · 🟠 3회 이하 · 🔴 0회 이하.",
        "**플랜** 칸: 지금 플랜 종류 · 결제일 · 시작일 ~ 종료일. 아직 안 잡힌 수업은 같은 요일로 계속한다고 보고 **(예상)** 날짜를 보여 줘요.",
        "학생 줄을 누르면 오른쪽 칸(폰은 아래 창)에서 바로 **플랜 등록 · 횟수 조정 · 노트 · 횟수 기록**을 볼 수 있어요. 전체 정보는 **자세히 ›**.",
        "**+ 학생 추가**: 이름, 영어 이름(비우면 자동 변환, 예: 나상현 → Na Sanghyeon), 기본 수업 길이.",
        "체크칸으로 여러 명을 골라 **보관**(목록에서 숨김, 되돌릴 수 있음) 또는 **완전 삭제**(모든 기록까지 영구 삭제)할 수 있어요.",
        "남은 횟수 0회로 30일이 지나고 예정 수업이 없으면 자동으로 보관돼요.",
      ],
    },
    {
      id: "credits",
      icon: "🎟️",
      title: "횟수(수강권) 규칙",
      table: {
        head: ["상황", "차감"],
        rows: [
          ["수업 완료", "수업 길이만큼 (30분 = 1회, 60분 = 2회, 90분 = 3회)"],
          ["결석 (빠진 수업은 모두 결석)", "수업 길이만큼"],
          ["연기 — 선생님·매니저가 허락한 경우만", "0회"],
        ],
      },
      bullets: [
        "**플랜 등록**: 결제할 때마다 종류(4주 기준 **주 1회 4회 · 주 2회 8회 · 주 3회 12회 · 주 4회 16회 · 주 5회 20회**, 또는 1회 테스트)와 결제일을 골라요. 남은 횟수에 더해지고, 남은(이월) 횟수 → 먼저 등록한 플랜 순서로 쓰여요.",
        "**시작일·종료일**은 자동 계산: 새 플랜의 첫 수업이 시작, 그 플랜의 마지막 회차 수업이 종료예요.",
        "**플랜 수정**에서 종류를 바꿀 수 있어요 (예: 주 1회 4회 → 주 3회 12회). 차이만큼 남은 횟수가 바뀌어요.",
        "**횟수 조정**: 보너스·정정용. 사유를 꼭 적어요. 기록은 지울 수 없으니, 잘못 넣었으면 반대 방향으로 한 번 더 조정해요.",
        "**되돌리기**: 처리한 수업을 \"예정\"으로 되돌리면 차감된 횟수가 그대로 돌아와요.",
        "남은 횟수가 부족해도 완료 처리는 할 수 있어요(확인 후). 마이너스는 다음 플랜에서 메워져요.",
      ],
    },
    {
      id: "feedback",
      icon: "💬",
      title: "피드백",
      steps: [
        "Michelle이 달력에서 수업을 눌러 **💬 수업 피드백**을 써요 (필요할 때만).",
        "Lee는 **피드백** 메뉴에서 모든 피드백을 모아 봐요. 영어 피드백은 한국어로 번역돼 보여요 (🌐 원문 보기 가능).",
        "**📋 카톡용 복사**를 누르면 \"[학생 · 날짜 수업] 👍 잘한 점: …\" 형태로 복사돼요. 카톡에 붙여 넣어 학부모에게 전달해요.",
        "**📅 날짜 수업 ›** 을 누르면 달력에서 그 수업이 바로 열려요.",
      ],
      bullets: ["수업과 상관없는 피드백은 피드백 메뉴의 **+ 피드백 쓰기**로 써요 (\"일반\"으로 표시)."],
    },
    {
      id: "notes",
      icon: "🗂️",
      title: "메모·노트 한눈에 보기",
      table: {
        head: ["종류", "어디에", "누가 보나", "용도"],
        rows: [
          ["홈 메모", "홈", "둘 다 (각자 자기 칸만 수정)", "서로에게 남기는 말"],
          ["🔒 학생 노트 · 개별용", "학생 화면", "쓴 사람만", "나만 보는 학생 메모"],
          ["👥 학생 노트 · 공유용", "학생 화면", "둘 다", "함께 알아야 할 학생 정보"],
          ["📝 수업 노트", "달력 수업", "둘 다", "그 수업 준비·기록"],
          ["💬 피드백", "달력 수업 · 피드백 메뉴", "둘 다", "학부모에게 전할 내용"],
        ],
      },
      tip: "다른 언어로 쓴 글은 **DeepL 자동 번역**으로 보여요. 번역이 이상하면 🌐 원문 보기로 원래 글을 확인하세요.",
    },
    {
      id: "settings",
      icon: "⚙️",
      title: "설정",
      bullets: [
        "**Zoom 링크**: 모든 수업에서 같이 쓰는 고정 링크를 저장하면 달력·수업 화면에 **Zoom 열기** 버튼이 생겨요.",
        "**수업·횟수 규칙**: 지금 적용 중인 차감·연기·플랜 규칙을 보여 줘요.",
      ],
    },
    {
      id: "faq",
      icon: "❓",
      title: "자주 묻는 것",
      table: {
        head: ["이럴 때", "이렇게"],
        rows: [
          ["완료·결석을 잘못 눌렀어요", "수업의 **자세히 ›** → **되돌리기**"],
          ["플랜 종류를 잘못 골랐어요", "학생 → 자세히 → 플랜 **수정** → 종류 다시 고르기"],
          ["화면이 바뀌지 않아요", "**Ctrl + Shift + R** 로 새로고침"],
          ["이름이 영어로 이상하게 나와요", "학생 → 자세히 → **수정** → 영어 이름 칸에 직접 입력"],
          ["폰에서 앱처럼 쓰고 싶어요", "브라우저 메뉴 → **홈 화면에 추가**"],
        ],
      },
    },
  ],
};

const en: Guide = {
  title: "User guide",
  subtitle: "How to use the class schedule and credit site. Feel free to jump to the part you need.",
  sections: [
    {
      id: "start",
      icon: "👋",
      title: "Getting started",
      bullets: [
        "Log in with your ID. There are two accounts: **Lee** (manager, Korea time) and **Michelle** (teacher, Philippine time).",
        "Menu: **Home · Calendar · Students · Feedback · Settings** — at the bottom on phones, at the top on PCs.",
        "Use the **한국어 / English** button (top right) to switch language. In English, student names appear in English and Korean notes/feedback are translated.",
        "Times are shown **in your own time zone**, with the other person's time in small text. e.g. Michelle: 17:00 (Korea 18:00)",
      ],
      tip: "If a page still looks old, reload it with **Ctrl + Shift + R** (or refresh on your phone).",
    },
    {
      id: "home",
      icon: "🏠",
      title: "Home",
      bullets: [
        "Shows your **next class** and **today's classes**. Classes with a note show 📝 and a yellow stripe.",
        "**📢 Students running low on classes**: students with 3 or fewer credits left. Click to open the student.",
        "**Two memo boxes**: manager memo and teacher memo. You can only edit your own; memos in the other language are auto-translated.",
      ],
    },
    {
      id: "calendar",
      icon: "📅",
      title: "Calendar — viewing and adding classes",
      bullets: [
        "Shows one week (Sun–Sat). Use ◀ ▶ to move weeks, or click the title to pick a date.",
        "PC shows a timetable (Philippines 16:00–00:00, Korea 17:00–01:00). On phones, tap a day to see its classes.",
        "Holidays are shown in red with their name (🇰🇷 Korea, 🇵🇭 Philippines).",
        "Top of the right panel: **monthly overview** — number of classes, total time, credits, counts by length, done/scheduled/absent/postponed. (On phones: \"📊 This month\" button.)",
      ],
      steps: [
        "**PC**: **click** an empty time → a new class form opens on the right. **Drag** to set the start time and length together (30-min steps).",
        "Class length is **30, 60 or 90 min**. For an odd start like 8:20, change the start time in the form (10-min steps).",
        "Choose the student (search by part of the name); their default class length is filled in.",
        "While the form is open, clicking another empty time changes only the date and time.",
        "Click **Save** — the class appears right away. You get a warning if it overlaps another class.",
        "**Phone** or another way: the **+ Add class** button at the top.",
      ],
    },
    {
      id: "lesson",
      icon: "✅",
      title: "Calendar — marking classes, notes, feedback",
      intro: "Click a class to open it in the right panel (on phones, a sheet slides up from the bottom).",
      bullets: [
        "**✓ Completed / ✕ Absent / ⏸ Postpone**: marks it right away. Completed and Absent use credits by length; **Postpone uses none** (only when the teacher/manager allows it).",
        "**📝 Class note** (yellow box): shared by Lee and Michelle. You can write it even after the class is done; it shows who wrote it and when. Classes with a note get a yellow stripe.",
        "**💬 Class feedback**: what to tell the parent. Pick a type (👍 Did well / ✏️ To improve / 📌 Note) and write. Classes with feedback show 💬.",
        "**Edit class**: change student, date, time, length, or delete (scheduled classes only).",
        "**Undo**: use **Details ›**.",
        "Below, you see the student's **classes this month**. Click one to jump to it.",
      ],
      tip: "On a PC you can **drag** a scheduled class to another day or time (a confirm box appears when you drop it).",
    },
    {
      id: "repeat",
      icon: "🔁",
      title: "Calendar — copy week · repeat · print",
      bullets: [
        "**Copy week**: choose the week to copy from (recent 6 weeks or a date); classes are copied to the week you are viewing on the same days and times. Existing classes and **Korean holidays** are skipped.",
        "**Repeat**: pick student, days, time and number of weeks to create many classes at once.",
        "**Print**: monthly calendar (page 1) + credits per student (page 2) on landscape A4. You can also print one student only.",
      ],
    },
    {
      id: "students",
      icon: "🧑‍🎓",
      title: "Students",
      bullets: [
        "Credits left are color-coded: 🟢 plenty · 🟠 3 or fewer · 🔴 0 or less.",
        "Click a student row to open the right panel (phone: bottom sheet) with **add plan · adjust credits · notes · credit history**. Full info: **Details ›**.",
        "**+ Add student**: name, English name (leave empty for automatic, e.g. 나상현 → Na Sanghyeon), default class length.",
        "Select several with the checkboxes to **archive** (hide, can be undone) or **delete permanently** (removes all records).",
        "Students with 0 credits for 30 days and no upcoming class are archived automatically.",
      ],
    },
    {
      id: "credits",
      icon: "🎟️",
      title: "Credit rules",
      table: {
        head: ["Situation", "Credits used"],
        rows: [
          ["Class completed", "By length (30 min = 1, 60 min = 2, 90 min = 3)"],
          ["Absent (any missed class)", "By length"],
          ["Postpone — only when teacher/manager allows", "0"],
        ],
      },
      bullets: [
        "**Add plan**: each payment, pick the type (4 weeks: **1×/wk 4 · 2×/wk 8 · 3×/wk 12 · 4×/wk 16 · 5×/wk 20**, or 1-class trial) and payment date. Leftover credits are used first, then older plans.",
        "**Start / end dates** are automatic: the plan's first class is the start, its last class is the end. Start = green border, End = red border on the calendar.",
        "**Edit plan** lets you change the type (e.g. 4 → 12). The difference is added to or removed from the remaining credits.",
        "**Adjust**: for bonuses or corrections; a reason is required. Records can't be deleted — if you made a mistake, adjust once more in the opposite direction.",
        "**Revert**: setting a processed class back to \"scheduled\" returns its credits exactly.",
        "You can still mark a class done when credits run out (after a confirm). The minus is covered by the next plan.",
      ],
    },
    {
      id: "feedback",
      icon: "💬",
      title: "Feedback",
      steps: [
        "Michelle opens a class on the calendar and writes **💬 Class feedback** (only when needed).",
        "Lee sees all feedback in the **Feedback** menu, translated into Korean (🌐 Show original available).",
        "**📋 Copy** copies it as \"[Student · class date] 👍 Did well: …\" — ready to paste into KakaoTalk for the parent.",
        "Click **📅 Class date ›** to open that class on the calendar.",
      ],
      bullets: ["Feedback not tied to a class: use **+ Write feedback** in the Feedback menu (shown as \"General\")."],
    },
    {
      id: "notes",
      icon: "🗂️",
      title: "Notes at a glance",
      table: {
        head: ["Type", "Where", "Who can see", "For"],
        rows: [
          ["Home memo", "Home", "Both (each edits own)", "Messages to each other"],
          ["🔒 Student note · private", "Student", "Only the writer", "Your own notes"],
          ["👥 Student note · shared", "Student", "Both", "Info both should know"],
          ["📝 Class note", "Calendar class", "Both", "Prep / record for that class"],
          ["💬 Feedback", "Calendar class · Feedback menu", "Both", "What to tell the parent"],
        ],
      },
      tip: "Text written in the other language is **auto-translated by DeepL**. If a translation looks odd, use 🌐 Show original.",
    },
    {
      id: "settings",
      icon: "⚙️",
      title: "Settings",
      bullets: [
        "**Zoom link**: save the fixed link used for all classes — an **Open Zoom** button appears on the calendar and class pages.",
        "**Class & credit rules**: shows the current credit, postpone and plan rules.",
      ],
    },
    {
      id: "faq",
      icon: "❓",
      title: "FAQ",
      table: {
        head: ["If…", "Do this"],
        rows: [
          ["I marked completed/absent by mistake", "Class **Details ›** → **Revert**"],
          ["I picked the wrong plan type", "Student → Details → plan **Edit** → choose the type again"],
          ["The page doesn't change", "Reload with **Ctrl + Shift + R**"],
          ["A name looks wrong in English", "Student → Details → **Edit** → type the English name"],
          ["I want it like an app on my phone", "Browser menu → **Add to Home screen**"],
        ],
      },
    },
  ],
};

export const guides = { ko, en };
