"use client";

// 달력과 옆 칸(폰은 아래 창)이 함께 쓰는 상태: 지금 무엇을 보고 있는지
// 달력의 수업 칸·빈 시간·추가 버튼이 여기를 바꾸면, 옆 칸이 그 내용을 보여 줌
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PanelView =
  | { mode: "home" } // 이번 달 현황 + 이름 검색 + 이번 주 학생
  | { mode: "overview" } // home 과 같은 내용. 폰에서 "이번 달 현황" 버튼으로 아래 창에 띄울 때
  | { mode: "student"; studentId: string } // 학생의 한 달 수업
  | { mode: "lesson"; lessonId: string; studentId: string } // 수업 처리·수정 + 그 학생의 한 달 수업
  // 새 수업. slot 은 달력에서 빈 시간을 누를 때마다 1씩 늘어서 폼이 날짜·시각을 다시 받음
  | { mode: "new"; date: string; time: string; duration?: number; studentId?: string; slot: number };

type NewSlot = { date: string; time: string; duration?: number; studentId?: string };

type PanelContext = {
  view: PanelView;
  open: (view: PanelView) => void;
  openNew: (slot: NewSlot) => void;
  close: () => void;
  version: number; // 저장·처리 후 1씩 늘어남 → 옆 칸이 내용을 다시 가져옴
  refresh: () => void; // 달력 새로 그리기 + 옆 칸 다시 가져오기
};

const Ctx = createContext<PanelContext | null>(null);

export function CalendarPanelProvider({ children, initial }: { children: React.ReactNode; initial?: PanelView }) {
  const router = useRouter();
  const [view, setView] = useState<PanelView>(initial ?? { mode: "home" });
  const [version, setVersion] = useState(0);

  const openNew = useCallback(
    (s: NewSlot) =>
      setView((v) => ({
        mode: "new",
        ...s,
        // 학생 수업 목록에서 "추가"를 눌렀거나, 이미 학생을 골라 둔 새 수업이면 학생 유지
        studentId: s.studentId ?? (v.mode === "new" ? v.studentId : undefined),
        slot: (v.mode === "new" ? v.slot : 0) + 1,
      })),
    [],
  );

  const value = useMemo<PanelContext>(
    () => ({
      view,
      open: setView,
      openNew,
      close: () => setView({ mode: "home" }),
      version,
      refresh: () => {
        router.refresh();
        setVersion((n) => n + 1);
      },
    }),
    [view, openNew, version, router],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanel() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePanel 은 CalendarPanelProvider 안에서만 쓸 수 있어요");
  return ctx;
}
