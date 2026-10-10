"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveNote, type NoteFormState } from "@/lib/note-actions";
import { NOTE_MAX } from "@/config/rules";

type Props = {
  title: string; // "매니저 메모 · 이 매니저"
  content: string;
  updatedLabel: string | null; // "마지막 수정 10/10 16:20"
  editable: boolean; // 내 메모 칸이면 true
  accent: "brand" | "sunny";
  t: { placeholder: string; empty: string; save: string; saving: string; saved: string; edit: string; cancel: string; errors: { tooLong: string; save: string } };
};

// 홈 메모 한 칸: 내 칸은 고치기, 상대 칸은 읽기만
export default function NoteCard({ title, content, updatedLabel, editable, accent, t }: Props) {
  const [state, onSubmit, pending] = useActionForm<NoteFormState>(saveNote, {});
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  const saved = state.saved && !pending && !editing;
  const tone = accent === "brand" ? "border-brand-200 bg-brand-50" : "border-sunny-300 bg-sunny-100";

  return (
    <section className={`flex flex-col rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold">📌 {title}</h2>
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
        <p className={`mt-2 min-h-12 flex-1 whitespace-pre-wrap ${text ? "text-gray-800" : "text-gray-400"}`}>
          {text || t.empty}
        </p>
      )}

      {state.error && <p className="mt-2 text-sm text-red-600">{t.errors[state.error]}</p>}
      <p className="mt-2 text-xs text-gray-500">
        {saved ? `✓ ${t.saved}` : updatedLabel}
      </p>
    </section>
  );
}
