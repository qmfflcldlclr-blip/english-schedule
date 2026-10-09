"use client";

import { useState, useTransition } from "react";
import { deleteLesson } from "@/lib/lesson-actions";

type Props = {
  lessonId: string;
  date: string;
  t: { delete: string; deleting: string; deleteConfirm: string; error: string };
};

export default function DeleteLessonButton({ lessonId, date, t }: Props) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t.deleteConfirm)) return;
          startTransition(async () => {
            const result = await deleteLesson(lessonId, date);
            if (result?.error) setFailed(true);
          });
        }}
        className="min-h-11 rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? t.deleting : t.delete}
      </button>
      {failed && <p className="text-sm text-red-600">{t.error}</p>}
    </div>
  );
}
