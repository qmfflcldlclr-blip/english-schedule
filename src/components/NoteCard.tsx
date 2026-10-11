"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveNote, saveStudentNote, type NoteFormState } from "@/lib/note-actions";
import type { Translation } from "@/lib/translate";
import { NOTE_MAX } from "@/config/rules";

type Props = {
  title: string; // "매니저 메모 · 이 매니저"
  content: string;
  updatedLabel: string | null; // "마지막 수정 10/10 16:20"
  editable: boolean; // 내 메모 칸이면 true
  accent: "brand" | "sunny";
  locale: string; // 번역: 이 언어로
  translation?: Translation; // 서버에서 미리 번역한 결과 (null = 번역 필요 없음, unavailable = 구글 번역 버튼)
  // 학생 노트면 저장할 칸 (없으면 홈 메모)
  studentNote?: { studentId: string; visibility: "private" | "shared" };
  icon?: string; // 제목 앞 그림 (기본 📌)
  t: { translate: string; autoTranslated: string; placeholder: string; empty: string; save: string; saving: string; saved: string; edit: string; cancel: string; errors: { tooLong: string; save: string; setup: string } };
};

// 홈 메모 한 칸: 내 칸은 고치기, 상대 칸은 읽기만
export default function NoteCard({ title, content, updatedLabel, editable, accent, locale, translation, studentNote, icon = "📌", t }: Props) {
  const [state, onSubmit, pending] = useActionForm<NoteFormState>(studentNote ? saveStudentNote : saveNote, {});
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  const saved = state.saved && !pending && !editing;
  const tone = accent === "brand" ? "border-brand-200 bg-brand-50" : "border-sunny-300 bg-sunny-100";

  return (
    <section className={`flex flex-col rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold">{icon} {title}</h2>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-mt-2 -mr-2 min-h-11 shrink-0 rounded-full px-3 text-sm font-medium text-brand-700 hover:bg-white/70"
          >
            ✏️ {t.edit}
          </button>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            onSubmit(e);
            setEditing(false);
          }}
          className="mt-2 flex flex-col gap-2"
        >
          {studentNote && (
            <>
              <input type="hidden" name="student_id" value={studentNote.studentId} />
              <input type="hidden" name="visibility" value={studentNote.visibility} />
            </>
          )}
          <textarea
            name="content"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={NOTE_MAX}
            autoFocus
            placeholder={t.placeholder}
            className="w-full rounded-xl border border-gray-300 p-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setText(content);
                setEditing(false);
              }}
              className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white font-medium"
            >
              {t.cancel}
            </button>
            <button type="submit" disabled={pending} className="min-h-11 flex-1 rounded-xl bg-brand-600 font-medium text-white disabled:opacity-60">
              {pending ? t.saving : t.save}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={`mt-2 min-h-12 flex-1 whitespace-pre-wrap ${text ? "text-gray-800" : "text-gray-400"}`}>
            {text || t.empty}
          </p>
          {/* 자동 번역 (저장한 글 기준. 방금 고친 글은 저장 후 새로 번역됨) */}
          {translation && "text" in translation && text === content && (
            <div className="mt-2 rounded-xl bg-white/70 p-3">
              <p className="text-xs font-medium text-gray-500">🌐 {t.autoTranslated}</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700">{translation.text}</p>
            </div>
          )}
        </>
      )}

      {state.error && <p className="mt-2 text-sm text-red-600">{t.errors[state.error]}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{saved ? `✓ ${t.saved}` : updatedLabel}</p>
        {/* 번역: 구글 번역을 새 창으로 (언어 자동 감지 → 지금 화면 언어) */}
        {text && !editing && !(translation && "text" in translation) && (
          <a
            href={`https://translate.google.com/?sl=auto&tl=${locale}&op=translate&text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="-mr-2 -mb-2 flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-brand-700 hover:bg-white/70"
          >
            🌐 {t.translate}
          </a>
        )}
      </div>
    </section>
  );
}
