"use client";

import { useState, useTransition } from "react";

type Props = {
  // 실제 삭제를 하는 서버 함수 (수업 1개 삭제 / 이후 반복 모두 삭제)
  action: () => Promise<{ error?: boolean } | void>;
  t: { delete: string; deleting: string; deleteConfirm: string; error: string };
  subtle?: boolean;
};

export default function DeleteLessonButton({ action, t, subtle }: Props) {
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
            const result = await action();
            if (result?.error) setFailed(true);
          });
        }}
        className={`min-h-11 rounded-lg px-4 text-sm font-medium hover:bg-red-50 disabled:opacity-60 ${subtle ? "text-red-500" : "text-red-600"}`}
      >
        {pending ? t.deleting : t.delete}
      </button>
      {failed && <p className="text-sm text-red-600">{t.error}</p>}
    </div>
  );
}
